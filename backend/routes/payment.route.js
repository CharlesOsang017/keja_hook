import express from 'express'
import { handleCallback, initiatePayment } from '../controllers/payment.controller.js';
import { protectRoute } from '../middleware/protectRoute.js';


const router = express.Router()

router.post('/pay', protectRoute, initiatePayment);
router.post('/callback', protectRoute, handleCallback);

export default router