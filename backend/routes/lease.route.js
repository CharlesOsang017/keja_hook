import express from 'express'
import { createLease, getLeases, getDetailLease, updateLease } from '../controllers/lease.controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router()
router.post("/", protectRoute, createLease)
router.get("/", protectRoute, getLeases)
router.get("/:id", protectRoute, getDetailLease)
router.put("/:id", protectRoute, updateLease)
export default router;