import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { initiateRentPayment, verifyPayment } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/rent", protectRoute, initiateRentPayment)
router.post("/verify", protectRoute, verifyPayment)

export default router;
