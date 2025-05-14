import Recommendation from "../models/recommendation.model.js";


// @route   POST /api/favarites/
// @desc    Add property to favorites
export const makeFavorite = async (req, res) => {
  try {
    const { propertyId } = req.body;
    const userId = req.user._id;

    // Check if already favorited
    const existingFavorite = await Recommendation.findOne({
      user: userId,
      property: propertyId,
      action: "favorite",
    });

    if (existingFavorite) {
      return res.status(400).json({
        message: "Property is already in your favorites",
      });
    }

    // Create new favorite
    const favorite = await Recommendation.create({
      user: userId,
      property: propertyId,
      action: "favorite",
    });

    res.status(201).json({
      message: "Property added to favorites",
      favorite,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error adding to favorites",
      error: error.message,
    });
  }
};


// @route   POST /api/favarites/:id
// @desc    remove property from favorites
export const removeFavorite = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id;

    const result = await Recommendation.findOneAndDelete({
      user: userId,
      property: propertyId,
      action: "favorite",
    });

    if (!result) {
      return res.status(404).json({
        message: "Favorite not found",
      });
    }

    res.status(200).json({
      message: "Property removed from favorites",
      removedFavorite: result,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error removing from favorites",
      error: error.message,
    });
  }
};

// @route   GET /api/favarites/
// @desc    retrieve all favorite properties from the DB
export const allFavorites = async (req, res) => {
  const userId = req.user._id;
  try {
    const favorites = await Recommendation.find({
      user: userId,
      action: "favorite",
    })
      .populate({
        path: "property",
        select: "title images location rentalPrice propertyType",
      })
      .sort({ createdAt: -1 });
    // Filter out recommendations where the property might have been deleted
    const validFavorites = favorites.filter((fav) => fav.property !== null);

    return res.status(200).json(validFavorites);
  } catch (error) {
    console.log("error in allFavorites controller", error.message);
    return res.status(500).json({ message: error.message });
  }
};
