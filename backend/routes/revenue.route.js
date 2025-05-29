import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js'
import { createPartnership, getPartnerships, getRevenueAnalytics } from '../controllers/partnership.controller.js'

const router = express.Router()
router.post("/create-partnership", protectRoute, createPartnership)
router.get("/all-partners", protectRoute, getPartnerships)
router.get("/revenue-analytics", protectRoute, getRevenueAnalytics)
export default router