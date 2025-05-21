import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js'
import { investInProperty, getAllProperties, createProperty } from '../controllers/investment.controller.js'

const router = express.Router()
router.post("/invest", protectRoute, investInProperty)
router.get("/properties", protectRoute, getAllProperties)
router.post("/create", protectRoute, createProperty)
export default router