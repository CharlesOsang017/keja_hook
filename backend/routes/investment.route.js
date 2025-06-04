import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  initiateInvestment,
  verifyInvestmentPayment,
  investmentCallback,
} from "../controllers/investment.controller.js";

const router = express.Router();
router.post("/invest", protectRoute, initiateInvestment);
router.post("/verify", protectRoute, verifyInvestmentPayment);
router.post("/callback", protectRoute, investmentCallback);

export default router;
