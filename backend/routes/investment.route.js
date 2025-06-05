import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  initiateInvestment,
  verifyInvestmentPayment,
  investmentCallback,
  getInvestments,
  getRevenueAnalytics,
  purchasePropertyTokens
} from "../controllers/investment.controller.js";

const router = express.Router();
router.post("/invest", protectRoute, initiateInvestment);
router.post("/verify/:checkoutRequestID", protectRoute, verifyInvestmentPayment);
router.post("/callback", protectRoute, investmentCallback);
router.get("/", protectRoute, getInvestments);
router.get("/analytics", protectRoute, getRevenueAnalytics)
router.post('/purchase_tokens', protectRoute, purchasePropertyTokens)

export default router;
