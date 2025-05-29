// @route   POST /api/revenue/artnershipserships

import { lipaNaMpesaOnline } from "../config/mpesa.config.js";
import Partnership from "../models/partnership.model.js";
import Payment from "../models/payment.model.js";
import { validationResult } from 'express-validator';

// @desc    Create a partnership
export const createPartnership = async (req, res) => {
    if (req.user.role !== 'investor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
  
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      const { type, name, phone } = req.body;
      const fee = parseFloat(process.env.PARTNERSHIP_FEE) || 50000; // KES 50,000
  
      const formattedPhone = phone.startsWith('0')
        ? `254${phone.substring(1)}`
        : phone.startsWith('+')
        ? phone.substring(1)
        : phone;
  
      const accountReference = `PARTNER-${req.user._id}-${Date.now()}`;
      const transactionDesc = `Partnership: ${name}`;
      const callbackUrl = `${process.env.BASE_URL}/api/payments/callback`;
  
      const response = await lipaNaMpesaOnline(
        formattedPhone,
        fee,
        accountReference,
        transactionDesc,
        callbackUrl
      );
  
      const payment = await Payment.create({
        user: req.user._id,
        amount: fee,
        type: 'partnership',
        transactionId: response.CheckoutRequestID,
        phone: formattedPhone,
        status: 'pending',
        description: transactionDesc,
        fees: { partnership: fee },
      });
  
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setYear(startDate.getFullYear() + 1);
  
      const partnership = await Partnership.create({
        partner: req.user._id,
        type,
        name,
        fee,
        status: 'pending',
        startDate,
        endDate,
        paymentId: payment._id,
      });
  
      res.json({
        message: 'Partnership payment initiated',
        checkoutRequestID: response.CheckoutRequestID,
      });
    } catch (err) {
      console.error('Partnership error:', err.message);
      res.status(500).send('Server error');
    };
  };
  