import Recommendation from "../models/recommendation.model.js";

export const makeFavorite = async (req, res) => {
    try {
      const { propertyId } = req.body;
      const userId = req.user._id;
  
      // Check if already favorited
      const existingFavorite = await Recommendation.findOne({
        user: userId,
        property: propertyId,
        action: "favorite"
      });
  
      if (existingFavorite) {
        return res.status(400).json({ 
          message: "Property is already in your favorites" 
        });
      }
  
      // Create new favorite
      const favorite = await Recommendation.create({
        user: userId,
        property: propertyId,
        action: "favorite"
      });
  
      res.status(201).json({
        message: "Property added to favorites",
        favorite
      });
  
    } catch (error) {
      res.status(500).json({ 
        message: "Error adding to favorites",
        error: error.message 
      });
    }
  };