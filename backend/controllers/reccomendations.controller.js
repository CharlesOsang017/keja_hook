export const getReccommendations = async (req, res) => {
  try {
    const { userPreferences } = req.body;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: `Suggest properties in Kenya for: ${userPreferences}`,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      }
    );

    const suggestion = response.data.choices[0].message.content;
    res.json({ suggestion });
  } catch (error) {
    console.log("error in getReccommendations controller", error.message);
    return res.status(500).json({ message: error.message });
  }
};
