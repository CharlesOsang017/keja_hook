import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    getMemberships,
  initiateMembershipUpgrade,
  verifyUpgradePayment,
  membershipUpgradeCallback
} from "../controllers/membership.controller.js";

const router = express.Router();
router.post("/upgrade", protectRoute, initiateMembershipUpgrade);
router.post("/verify/:checkoutRequestID", protectRoute, verifyUpgradePayment);
router.get("/memberships", protectRoute, getMemberships);
router.post("/callback", protectRoute, membershipUpgradeCallback);

export default router;
