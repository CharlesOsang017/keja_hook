import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  initiateMembershipUpgrade,
  verifyUpgradePayment,
} from "../controllers/membership.controller.js";

const router = express.Router();
router.post("/upgrade", protectRoute, initiateMembershipUpgrade);
router.post("/verify/:checkoutRequestID", protectRoute, verifyUpgradePayment);
export default router;
