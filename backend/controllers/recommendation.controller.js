import axios from "axios";
import Property from "../models/property.model.js";
import Recommendation from "../models/recommendation.model.js";

export const autoRecommendations = async (req, res) => {
  try {
    console.log("Starting auto-recommendations");

    // 1. Authentication check
    if (!req.user || !req.user._id) {
      console.error("No user in request");
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user._id;
    console.log(`Processing recommendations for user ${userId}`);

    // 2. Get user's recent interactions
    const recommendations = await Recommendation.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "property",
        select: "title propertyType location rentalPrice propertyStatus",
      });

    console.log(`Found ${recommendations.length} recent interactions`);

    if (!recommendations.length) {
      console.log("No interactions found - showing newest properties");
      const fallbackProperties = await Property.find({
        propertyStatus: "available",
      })
        .sort({ createdAt: -1 })
        .limit(5);

      return res.status(200).json({
        recommendation: "Here are some new listings:",
        properties: fallbackProperties,
      });
    }

    // 3. Extract patterns
    const locations = [
      ...new Set(
        recommendations.map((i) => i.property?.location).filter(Boolean)
      ),
    ];
    const types = [
      ...new Set(
        recommendations.map((i) => i.property?.propertyType).filter(Boolean)
      ),
    ];
    const prices = recommendations
      .map((i) => i.property?.rentalPrice)
      .filter((price) => typeof price === "number");

    const avgPrice = prices.length
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : 20000; // Default fallback price

    console.log(
      `User patterns - Locations: ${locations}, Types: ${types}, Avg Price: ${avgPrice}`
    );

    // 4. Find similar properties
    const similarProperties = await Property.find({
      propertyStatus: "available",
      $or: [{ location: { $in: locations } }, { propertyType: { $in: types } }],
      rentalPrice: { $lte: avgPrice + 10000 },
    }).limit(5);

    console.log(`Found ${similarProperties.length} similar properties`);

    // 5. Generate AI recommendation (if properties found)
    let aiRecommendation = "Here are some properties you might like:";

    if (similarProperties.length) {
      try {
        const prompt =
          `Recommend these properties to a user who likes ${types.join(
            ", "
          )} in ${locations.join(", ")}:\n` +
          similarProperties
            .map(
              (p, i) =>
                `${i + 1}. ${p.title} (${p.propertyType}) - KSh ${
                  p.rentalPrice
                } in ${p.location}`
            )
            .join("\n");

        const aiResponse = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo", // More cost-effective than gpt-4
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 150,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 5000, // 5 second timeout
          }
        );

        aiRecommendation = aiResponse.data.choices[0].message.content;
      } catch (aiError) {
        console.error("AI recommendation failed:", aiError.message);
      if (aiError.response?.status === 429) {
        aiRecommendation = "Our recommendation system is currently busy. Here are some properties you might like:";
      }else{
        aiRecommendation = "Here are some properties matching your preferences:";
      }
    }}

    // 6. Return response
    res.status(200).json({
      recommendation: aiRecommendation,
      properties: similarProperties,
    });
  } catch (error) {
    console.error("Auto-recommendation error:", error);
    res.status(500).json({
      message: "Error generating recommendations",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};
