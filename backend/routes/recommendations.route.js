import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js';
import { autoRecommendations } from '../controllers/recommendation.controller.js';

const router = express.Router()

router.get("/auto", protectRoute, autoRecommendations)

export default router;