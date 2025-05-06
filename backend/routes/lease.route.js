import express from 'express'
import { createLease, getLeases } from '../controllers/lease.controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router()
router.post("/", protectRoute, createLease)
router.get("/", protectRoute, getLeases)
export default router;