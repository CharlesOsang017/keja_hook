import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  initiateRentPayment,
  verifyPayment,
  mpesaCallback,
  initiateMembershipUpgrade,
  initiatePropertyPurchase,
  verifyUpgradePayment,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/rent", protectRoute, initiateRentPayment);
router.post("/verify", protectRoute, verifyPayment);
router.post("/callback", protectRoute, mpesaCallback);
router.post("/purchase", protectRoute, initiatePropertyPurchase);
router.post("/upgrade", protectRoute, initiateMembershipUpgrade);
router.post("/verify", protectRoute, verifyUpgradePayment);

export default router;
