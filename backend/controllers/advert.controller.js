import Membership from "../models/membership.model.js"; // Adjust path as needed
import Advertisement from "../models/advert.model.js"; // Adjust path as needed

export const createAdWithLimit = async (req, res) => {
  try {
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const userId = req.user._id;

    // 2. Validate active membership
    const membership = await Membership.findOne({
      user: userId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (!membership) {
      return res.status(403).json({
        message: "You must have an active membership to post an ad.",
      });
    }

    const plan = membership.plan;

    // 3. Restrict Basic users
    if (plan === "Basic") {
      return res.status(403).json({
        message: "Upgrade to Pro or Premium to post ads.",
      });
    }

    // 4. Apply Pro plan ad posting limit
    if (plan === "Pro") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayAdsCount = await Advertisement.countDocuments({
        advertiser: userId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      if (todayAdsCount >= 2) {
        return res.status(429).json({
          message:
            "Pro plan allows only 2 ads per day. Upgrade to Premium for unlimited ad posting.",
        });
      }
    }

    // 5. Validate request body
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        message: "Request body is missing or invalid.",
      });
    }

    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Start date and end date are required.",
      });
    }

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);

    if (isNaN(parsedStart) || isNaN(parsedEnd)) {
      return res.status(400).json({
        message: "Invalid start or end date format.",
      });
    }

    if (parsedEnd < parsedStart) {
      return res.status(400).json({
        message: "End date must be after start date.",
      });
    }

    const now = new Date();
    const isActive = parsedStart <= now && parsedEnd >= now;

    // 6. Create the ad
    const ad = new Advertisement({
      ...req.body,
      advertiser: userId,
      isActive,
    });

    await ad.save();

    return res.status(201).json({
      message: "Ad created successfully.",
      ad,
    });
  } catch (error) {
    console.error("Ad creation error:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      message: "Server error. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};