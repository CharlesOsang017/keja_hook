import express from 'express'
import { createLease, getLeases, getDetailLease } from '../controllers/lease.controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router()
router.post("/", protectRoute, createLease)
router.get("/", protectRoute, getLeases)
router.get("/:id", protectRoute, getDetailLease)
export default router;