import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { createAdWithLimit } from "../controllers/advert.controller.js";

const router = express.Router();
router.post("/", protectRoute, createAdWithLimit);
export default router;
