import Advertisement from "../models/advert.model.js";
import Membership from "../models/membership.model.js";

export const createAdWithLimit = async (req, res) => {
  try {
    const userId = req.user._id; // Use authenticated user ID from token/middleware

    // 1. Check active membership
    const membership = await Membership.findOne({
      user: userId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "Active membership required to post an ad." });
    }

    const plan = membership.planName;

    if (plan === "Basic") {
      return res
        .status(403)
        .json({ error: "Upgrade to Pro or Premium to post ads." });
    }

    // 2. If plan is Pro, check daily limit
    if (plan === "Pro") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayAdsCount = await Advertisement.countDocuments({
        advertiser: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      if (todayAdsCount >= 2) {
        return res.status(429).json({
          error:
            "Pro plan allows only 2 ads per day. Upgrade to Premium for unlimited posting.",
        });
      }
    }

    // 3. Create the ad
    const ad = new Advertisement({
      ...req.body,
      advertiser: userId,
    });

    await ad.save();

    return res.status(201).json({ message: "Ad created successfully", ad });
  } catch (error) {
    console.error("Ad creation error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
};
