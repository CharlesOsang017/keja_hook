import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { initiateRentPayment, verifyPayment, mpesaCallback } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/rent", protectRoute, initiateRentPayment)
router.post("/verify", protectRoute, verifyPayment)
router.post("/callback", protectRoute, mpesaCallback)

export default router;
