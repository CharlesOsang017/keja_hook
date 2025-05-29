import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js'
import { createPartnership } from '../controllers/partnership.controller.js'

const router = express.Router()
router.post("/create-partnership", protectRoute, createPartnership)
export default router