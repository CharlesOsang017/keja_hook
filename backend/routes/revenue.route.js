import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js'
import { createPartnership, getPartnerships } from '../controllers/partnership.controller.js'

const router = express.Router()
router.post("/create-partnership", protectRoute, createPartnership)
router.get("/all-partners", protectRoute, getPartnerships)
export default router