import {
  lipaNaMpesaOnline,
  verifyMpesaPayment,
} from "../config/mpesa.config.js";
import { validationResult } from "express-validator";
import Membership from "../models/membership.model.js";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";

// @route   POST /api/payments/upgrade
// @desc    Handle M-Pesa  for membership upgrade
export const initiateMembershipUpgrade = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { plan, phone } = req.body || {};
    const userId = req.user._id;

    const validPlans = {
      Pro: 1, 
      Premium: 2, 
    };

    if (!validPlans[plan]) {
      return res.status(400).json({ message: "Invalid membership plan selected" });
    }

    // Check the user's existing membership
    const existingMembership = await Membership.findOne({ user: userId, isActive: true });

    if (!existingMembership) {
      return res.status(404).json({ message: "No active membership found for this user" });
    }

    // Format phone: e.g., 0712345678 → 254712345678
    const formattedPhone = phone.replace(/^0/, "254").replace(/^\+/, "");
    const price = validPlans[plan];
    const accountReference = `MEMBERSHIP-${plan}-${userId}`;
    const description = `Upgrade to ${plan} plan`;
    const callbackUrl = `${process.env.BASE_URL}/api/payments/membership-callback`;

    const response = await lipaNaMpesaOnline(
      formattedPhone,
      price,
      accountReference,
      description,
      callbackUrl
    );

    const durationInDays = plan === "Pro" ? 30 : 90;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + durationInDays);

    // Update the existing membership
    existingMembership.plan = plan;
    existingMembership.price = price;
    existingMembership.transactionId = response.CheckoutRequestID;
    existingMembership.phone = formattedPhone;
    existingMembership.description = description;
    existingMembership.startDate = startDate;
    existingMembership.endDate = endDate;
    existingMembership.features =
      plan === "Pro"
        ? ["Basic Support", "5 Listings"]
        : plan === "Premium"
        ? ["Priority Support", "Unlimited Listings"]
        : [];
    existingMembership.isActive = false; 
    existingMembership.paymentStatus = "pending";

    await existingMembership.save();

    res.json({
      message: `Membership upgrade to ${plan} initiated`,
      checkoutRequestID: response.CheckoutRequestID,
    });
  } catch (err) {
    console.error("Membership upgrade error:", err.message);
    res.status(500).send("Server error");
  }
};

// @route   POST /api/payments/membership-callback
// @desc    Handle M-Pesa callback for membership upgrade
export const membershipUpgradeCallback = async (req, res) => {
  try {
    const callbackData = req.body;

    if (!callbackData?.Body?.stkCallback) {
      return res.status(400).json({ message: "Invalid callback data" });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
      callbackData.Body.stkCallback;

    const payment = await Payment.findOne({ transactionId: CheckoutRequestID });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    // If payment was already handled, exit early
    if (payment.status === "completed" || payment.status === "failed") {
      return res.status(200).json({ message: "Callback already processed" });
    }

    const membership = await Membership.findOne({
      transactionId: CheckoutRequestID,
      user: payment.user,
    });

    if (!membership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    if (ResultCode === 0) {
      // Extract metadata
      const metadata = CallbackMetadata.Item.reduce((acc, item) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});

      payment.status = "completed";
      payment.mpesaReceiptNumber = metadata.MpesaReceiptNumber;
      payment.transactionDate = new Date();
      await payment.save();

      // Update existing membership
      membership.paymentStatus = "paid";
      membership.isActive = true;
      membership.mpesaReceiptNumber = metadata.MpesaReceiptNumber;
      await membership.save();

      // Update user with membership ID 
      await User.findByIdAndUpdate(payment.user, {
        membership: membership._id,
      });
    } else {
      payment.status = "failed";
      payment.failureReason = ResultDesc;
      await payment.save();

      membership.paymentStatus = "failed";
      membership.isActive = false;
      membership.failureReason = ResultDesc;
      await membership.save();
    }

    res.status(200).json({ message: "Callback processed successfully" });
  } catch (err) {
    console.error("Callback processing error:", err.message);
    res.status(500).json({ message: "Error processing callback" });
  }
};

// @route   GET /api/payments/verify/:checkoutRequestID
// @desc    Verify membership upgrade payment
export const verifyUpgradePayment = async (req, res) => {
  try {
    const { checkoutRequestID } = req.params;
    const userId = req.user._id;

    const membership = await Membership.findOne({
      transactionId: checkoutRequestID,
      user: userId,
    });

    if (!membership) {
      return res.status(404).json({ message: "Membership payment not found" });
    }

    if (
      membership.paymentStatus === "paid" ||
      membership.paymentStatus === "failed"
    ) {
      return res.json({
        status: membership.paymentStatus,
        receipt: membership.mpesaReceiptNumber,
        plan: membership.plan,
        updatedAt: membership.updatedAt,
      });
    }

    const mpesaResponse = await verifyMpesaPayment(checkoutRequestID);

    if (mpesaResponse.ResultCode === "0") {
      const durationInDays = membership.plan === "Pro" ? 30 : 90;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationInDays);

      membership.paymentStatus = "paid";
      membership.mpesaReceiptNumber = mpesaResponse.MpesaReceiptNumber;
      membership.endDate = endDate;
      membership.isActive = true;
      await membership.save();

      await User.findByIdAndUpdate(userId, { membership: membership._id });

      return res.json({
        status: "paid",
        receipt: mpesaResponse.MpesaReceiptNumber,
        plan: membership.plan,
      });
    } else if (mpesaResponse.ResultCode !== "0") {
      membership.paymentStatus = "failed";
      membership.failureReason = mpesaResponse.ResultDesc;
      await membership.save();

      return res.json({
        status: "failed",
        reason: mpesaResponse.ResultDesc,
      });
    }

    return res.json({
      status: "pending",
      message: "Payment still processing. Check back later.",
    });
  } catch (err) {
    console.error("Payment verification error:", err.message);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

// @route   GET /api/membership/memberships
// @desc    Get all memberships
export const getMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find().populate("user");
    res.status(200).json(memberships);
  } catch (err) {
    console.error("Error fetching memberships:", err.message);
    res.status(500).json({ message: "Error fetching memberships" });
  }
};
