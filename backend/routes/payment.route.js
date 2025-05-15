import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  initiateRentPayment,
  verifyPayment,
  mpesaCallback,
  initiateMembershipUpgrade,
  initiatePropertyPurchase,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/rent", protectRoute, initiateRentPayment);
router.post("/verify", protectRoute, verifyPayment);
router.post("/callback", protectRoute, mpesaCallback);
router.post("/purchase", protectRoute, initiatePropertyPurchase);
router.post("/upgrade", protectRoute, initiateMembershipUpgrade);

export default router;
