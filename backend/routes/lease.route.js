import express from 'express'
import { createLease } from '../controllers/lease.controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router()
router.post("/", protectRoute, createLease)
export default router;