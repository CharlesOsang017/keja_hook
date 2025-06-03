import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js';
import { initiateInvestment } from '../controllers/investment.controller.js';

const router = express.Router()
router.post("/invest", protectRoute, initiateInvestment )

export default router;