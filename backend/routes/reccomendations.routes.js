import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router()

router.get("/", protectRoute, getReccommendations)

export default router;