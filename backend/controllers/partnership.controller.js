// @route   POST /api/revenue/artnershipserships

import { lipaNaMpesaOnline } from "../config/mpesa.config.js";
import Advertisement from "../models/advert.model.js";
import Membership from "../models/membership.model.js";
import Partnership from "../models/investment.model.js";
import Payment from "../models/payment.model.js";
import { validationResult } from 'express-validator';


// @route POST /api/revenue/create-partnership
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

// @route   GET /api/revenue/partnerships
// @desc    Get active partnerships
export const getPartnerships = async (req, res) => {
    try {
      const partnerships = await Partnership.find({ status: 'active' })
        .populate('partner', 'username');
      res.status(200).json(partnerships);
    } catch (err) {
      console.error('Get partnerships error:', err.message);
      res.status(500).send('Server error');
    };
  };

  // @route   GET /api/revenue/analyze
// @desc    Get revenue analytics
export const getRevenueAnalytics = async (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
  
    try {
      const payments = await Payment.find({ status: 'completed' });
      const subscriptions = await Membership.find({ status: 'active' });
      const partnerships = await Partnership.find({ status: 'active' });
      const ads = await Advertisement.find({ status: 'active' });
  
      const revenueBreakdown = {
        transactionFees: 0,
        rentCommissions: 0,
        tokenizationFees: 0,
        subscriptionFees: 0,
        advertisementFees: 0,
        featureFees: 0,
        partnershipFees: 0,
      };
  
      payments.forEach((payment) => {
        if (payment.fees.transaction) revenueBreakdown.transactionFees += payment.fees.transaction;
        if (payment.fees.commission) revenueBreakdown.rentCommissions += payment.fees.commission;
        if (payment.fees.tokenization) revenueBreakdown.tokenizationFees += payment.fees.tokenization;
        if (payment.fees.subscription) revenueBreakdown.subscriptionFees += payment.fees.subscription;
        if (payment.fees.advertisement) revenueBreakdown.advertisementFees += payment.fees.advertisement;
        if (payment.fees.feature) revenueBreakdown.featureFees += payment.fees.feature;
        if (payment.fees.partnership) revenueBreakdown.partnershipFees += payment.fees.partnership;
      });
  
      const totalRevenue = Object.values(revenueBreakdown).reduce((sum, val) => sum + val, 0);
  
      res.json({
        totalRevenue,
        revenueBreakdown,
        activeSubscriptions: subscriptions.length,
        activePartnerships: partnerships.length,
        activeAdvertisements: ads.length,
      });
    } catch (err) {
      console.error('Revenue analytics error:', err.message);
      res.status(500).send('Server error');
    }
  }
  