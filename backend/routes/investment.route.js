import express from 'express'
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router()
router.post("/invest", protectRoute,  )

export default router;