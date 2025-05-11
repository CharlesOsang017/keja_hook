import Recommendation from "../models/recommendation.model.js";

export const autoRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const recommendations = await Recommendation.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(5)
      .populate("property");

    if (!recommendations.length) {
      return res.status(404).json({ message: "No user interaction data yet" });
    }

    const locations = recommendations.map((i) => i.property.location);
    const types = recommendations.map((i) => i.property.propertyType);
    const prices = recommendations.map((i) => i.property.rentalPrice);

    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const similarProperties = await Property.find({
      propertyStatus: "available",
      location: { $in: locations },
      propertyType: { $in: types },
      rentalPrice: { $lte: avgPrice + 10000 },
    }).limit(5);

    const prompt = `Recommend suitable properties for a user who has recently interacted with:
${similarProperties
  .map(
    (p, i) =>
      `${i + 1}. ${p.title} (${p.propertyType}) - ${p.rentalPrice} in ${
        p.location
      }`
  )
  .join("\n")}`;

    const aiResponse = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({
      recommendation: aiResponse.data.choices[0].message.content,
      properties: similarProperties,
    });
  } catch (error) {
    console.log("Auto-recommendation error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
