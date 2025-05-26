import {
  lipaNaMpesaOnline,
  verifyMpesaPayment,
} from "../config/mpesa.config.js";
import { validationResult } from "express-validator";
import Membership from "../models/membership.model.js";
import Payment from "../models/payment.model.js";

// @route   POST /api/payments/upgrade
// @desc    Initiate membership upgrade via M-Pesa
export const initiateMembershipUpgrade = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { plan, phone } = req.body || {};
    const userId = req.user._id;

    const validPlans = {
      Pro: 1, // KES
      Premium: 2, // KES
    };

    if (!validPlans[plan]) {
      return res
        .status(400)
        .json({ message: "Invalid membership plan selected" });
    }

    // Format phone: e.g. 0712345678 → 254712345678
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

    await Membership.create({
      user: userId,
      plan,
      price,
      transactionId: response.CheckoutRequestID,
      phone: formattedPhone,
      description,
      startDate,
      endDate,
      features:
        plan === "Pro"
          ? ["Basic Support", "5 Listings"]
          : plan === "Premium"
          ? ["Priority Support", "Unlimited Listings"]
          : [],
      isActive: false,
      paymentStatus: "pending",
    });

    res.json({
      message: `Membership upgrade to ${plan} initiated`,
      checkoutRequestID: response.CheckoutRequestID,
    });
  } catch (err) {
    console.error("Membership upgrade error:", err.message);
    res.status(500).send("Server error");
  }
};

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

      const plan = payment.description
        .replace("Upgrade to ", "")
        .replace(" plan", "");

      const durationInDays = plan === "Pro" ? 30 : 90;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + durationInDays);

      // Deactivate any existing active memberships
      await Membership.updateMany(
        { user: payment.user, isActive: true },
        { isActive: false }
      );

      const newMembership = await Membership.create({
        user: payment.user,
        plan,
        price: payment.amount,
        phone: payment.phone,
        transactionId: payment.transactionId,
        description: payment.description,
        startDate,
        endDate,
        paymentStatus: "paid",
        isActive: true,
        features:
          plan === "Pro"
            ? ["Basic Support", "5 Listings"]
            : plan === "Premium"
            ? ["Priority Support", "Unlimited Listings"]
            : [],
      });

      // Link membership to user
      await User.findByIdAndUpdate(payment.user, {
        membership: newMembership._id,
      });
    } else {
      payment.status = "failed";
      payment.failureReason = ResultDesc;
      await payment.save();
    }

    res.status(200).json({ message: "Callback processed successfully" });
  } catch (err) {
    console.error("Callback processing error:", err.message);
    res.status(500).json({ message: "Error processing callback" });
  }
};

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

export const getMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find().populate("user");
    res.status(200).json(memberships);
  } catch (err) {
    console.error("Error fetching memberships:", err.message);
    res.status(500).json({ message: "Error fetching memberships" });
  }
};
