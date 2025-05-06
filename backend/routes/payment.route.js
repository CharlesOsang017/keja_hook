import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { initiateRentPayment } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/rent", protectRoute, initiateRentPayment)

export default router;
