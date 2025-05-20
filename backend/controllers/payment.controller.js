import {
  lipaNaMpesaOnline,
  verifyMpesaPayment,
} from "../config/mpesa.config.js";
import Lease from "../models/lease.model.js";
import Payment from "../models/payment.model.js";
import Property from "../models/property.model.js";
import TokenizedAsset from "../models/tokenizedAsset.model.js";
import { validationResult } from "express-validator";

// @route   POST /api/payments/rent
// @desc    Initiate rent payment via M-Pesa
export const initiateRentPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const { leaseId, phone } = req.body;
    const lease = await Lease.findById(leaseId).populate("tenant property");
    if (!lease) return res.status(404).json({ message: "Lease not found" });
    if (lease.tenant._id.toString() !== req.user.id)
      return res.status(401).json({ message: "Unauthorized" });

    const formattedPhone = phone.replace(/^0/, "254").replace(/^\+/, "");
    const amount = lease.monthlyRent;
    const accountReference = `RENT-${lease.property._id}-${lease.tenant._id}`;
    const transactionDesc = `Rent payment for ${lease.property.title}`;
    const callbackUrl = `${process.env.BASE_URL}/api/payments/callback`;

    const response = await lipaNaMpesaOnline(
      formattedPhone,
      amount,
      accountReference,
      transactionDesc,
      callbackUrl
    );

    await Payment.create({
      user: req.user._id,
      lease: lease._id,
      amount,
      type: "rent",
      transactionId: response.CheckoutRequestID,
      phone: formattedPhone,
      status: "pending",
      description: transactionDesc,
    });

    res.json({
      message: "Rent payment initiated",
      checkoutRequestID: response.CheckoutRequestID,
    });
  } catch (err) {
    console.error("Rent error:", err.message);
    res.status(500).send("Server error");
  }
};

// @route   POST /api/payments/purchase
// @desc    Initiate property purchase via M-Pesa
export const initiatePropertyPurchase = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const { propertyId, phone } = req.body;
    const property = await Property.findById(propertyId);
    if (!property || property.type !== "sale") {
      return res
        .status(400)
        .json({ message: "Property unavailable for purchase" });
    }

    const formattedPhone = phone.replace(/^0/, "254").replace(/^\+/, "");
    const amount = property.price;
    const accountReference = `SALE-${propertyId}-${req.user._id}`;
    const description = `Purchase of property ${property.title}`;
    const callbackUrl = `${process.env.BASE_URL}/api/payment/callback`;

    const response = await lipaNaMpesaOnline(
      formattedPhone,
      amount,
      accountReference,
      description,
      callbackUrl
    );

    await Payment.create({
      user: req.user._id,
      property: property._id,
      amount,
      type: "sale",
      transactionId: response.CheckoutRequestID,
      phone: formattedPhone,
      status: "pending",
      description,
    });

    res.json({
      message: "Property purchase initiated",
      checkoutRequestID: response.CheckoutRequestID,
    });
  } catch (err) {
    console.error("Sale error:", err.message);
    res.status(500).send("Server error");
  }
};

// @route   POST /api/payments/callback
// @desc    M-Pesa payment callback
export const mpesaCallback = async (req, res) => {
  try {
    const callback = req.body.Body.stkCallback;
    if (callback.ResultCode !== 0)
      return res.json({ ResultCode: 0, ResultDesc: "Failed payment ignored" });

    const meta = callback.CallbackMetadata.Item;
    const get = (name) => meta.find((i) => i.Name === name)?.Value;

    const transactionId = callback.CheckoutRequestID;
    const amount = get("Amount");
    const receipt = get("MpesaReceiptNumber");
    const accountRef = get("AccountReference");
    const [type, refId, userId] = accountRef.split("-");

    const payment = await Payment.findOne({ transactionId });
    if (!payment)
      return res
        .status(404)
        .json({ ResultCode: 1, ResultDesc: "Payment not found" });

    payment.status = "completed";
    payment.mpesaReceiptNumber = receipt;
    payment.completedAt = new Date();
    await payment.save();

    if (type === "token") {
      const property = await Property.findById(refId);
      const tokens = Math.floor(amount / property.tokenPrice);
      property.availableTokens -= tokens;
      await property.save();

      for (let i = 0; i < tokens; i++) {
        await TokenizedAsset.create({
          property: property._id,
          tokenId: `TOKEN-${property._id}-${Date.now()}-${i}`,
          owner: userId,
          currentOwner: userId,
          purchasePrice: property.tokenPrice,
          purchaseDate: new Date(),
          transactionHash: receipt,
        });
      }
    }

    if (type === "sale") {
      await SaleTransaction.create({
        buyer: userId,
        property: refId,
        amount,
        status: "paid",
        transactionDate: new Date(),
      });
      await Property.findByIdAndUpdate(refId, { propertyStatus: "sold" });
    }

    res.json({ ResultCode: 0, ResultDesc: "Callback handled" });
  } catch (err) {
    console.error("Callback error:", err.message);
    res.status(500).json({ ResultCode: 1, ResultDesc: "Callback failure" });
  }
};

// @route   POST /api/payments/verify
// @desc    Verify M-Pesa payment status
export const verifyPayment = async (req, res) => {
  try {
    const { checkoutRequestID } = req.body;

    const response = await verifyMpesaPayment(checkoutRequestID);

    res.json(response);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @route   POST /api/payments/token-purchase
// @desc    Initiate token purchase payment
export const initiateTokenPurchase = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { propertyId, tokens, phone } = req.body;

    const property = await Property.findById(propertyId);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (!property.isTokenized) {
      return res.status(400).json({ message: "Property is not tokenized" });
    }

    if (tokens > property.availableTokens) {
      return res.status(400).json({ message: "Not enough tokens available" });
    }

    const amount = tokens * property.tokenPrice;

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phone.startsWith("0")
      ? `254${phone.substring(1)}`
      : phone;
    formattedPhone = formattedPhone.startsWith("+")
      ? formattedPhone.substring(1)
      : formattedPhone;

    const accountReference = `TOKEN-${propertyId}-${req.user.id}`;
    const transactionDesc = `Purchase of ${tokens} tokens for ${property.title}`;
    const callbackUrl = `${process.env.BASE_URL}/api/payments/token-callback`;

    const response = await lipaNaMpesaOnline(
      formattedPhone,
      amount,
      accountReference,
      transactionDesc,
      callbackUrl
    );

    // Save the transaction details (you might want to create a separate model for token purchases)
    // For now, we'll just return the response

    res.json({
      message: "Token purchase initiated successfully",
      checkoutRequestID: response.CheckoutRequestID,
      responseCode: response.ResponseCode,
      responseDescription: response.ResponseDescription,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @route   POST /api/payments/token-callback
// @desc    M-Pesa token purchase callback
export const tokenPurchaseCallback = async (req, res) => {
  try {
    const callbackData = req.body;

    // Check if the result code indicates success
    if (callbackData.Body.stkCallback.ResultCode === 0) {
      const checkoutRequestID = callbackData.Body.stkCallback.CheckoutRequestID;
      const metadata = callbackData.Body.stkCallback.CallbackMetadata.Item;

      // Extract payment details from callback
      const amount = metadata.find((item) => item.Name === "Amount").Value;
      const mpesaReceiptNumber = metadata.find(
        (item) => item.Name === "MpesaReceiptNumber"
      ).Value;
      const transactionDate = metadata.find(
        (item) => item.Name === "TransactionDate"
      ).Value;
      const phoneNumber = metadata.find(
        (item) => item.Name === "PhoneNumber"
      ).Value;

      // Parse account reference to get property and user details
      const accountReference = metadata.find(
        (item) => item.Name === "AccountReference"
      ).Value;
      const [_, propertyId, userId] = accountReference.split("-");

      // Calculate number of tokens purchased
      const property = await Property.findById(propertyId);
      const tokensPurchased = Math.floor(amount / property.tokenPrice);

      // Update property's available tokens
      property.availableTokens -= tokensPurchased;
      await property.save();

      // Create tokenized asset records (simplified - in reality you'd interact with blockchain here)
      for (let i = 0; i < tokensPurchased; i++) {
        const tokenizedAsset = new TokenizedAsset({
          property: propertyId,
          tokenId: `TOKEN-${propertyId}-${Date.now()}-${i}`,
          owner: userId,
          currentOwner: userId,
          purchasePrice: property.tokenPrice,
          purchaseDate: new Date(transactionDate),
          transactionHash: mpesaReceiptNumber,
        });

        await tokenizedAsset.save();
      }

      // TODO: Send confirmation email/notification
    }

    // Always acknowledge receipt of the callback
    res.json({ ResultCode: 0, ResultDesc: "Callback processed successfully" });
  } catch (err) {
    console.error(err.message);
    res
      .status(500)
      .json({ ResultCode: 1, ResultDesc: "Error processing callback" });
  }
};

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
      Pro: 5,
      Premium: 10,
    };

    if (!validPlans[plan]) {
      return res
        .status(400)
        .json({ message: "Invalid membership plan selected" });
    }

    const formattedPhone = phone.replace(/^0/, "254").replace(/^\+/, "");
    const amount = validPlans[plan];
    const accountReference = `MEMBERSHIP-${plan}-${userId}`;
    const description = `Upgrade to ${plan} plan`;
    const callbackUrl = `${process.env.BASE_URL}/api/payments/membership-callback`;

    const response = await lipaNaMpesaOnline(
      formattedPhone,
      amount,
      accountReference,
      description,
      callbackUrl
    );

    await Payment.create({
      user: userId,
      amount,
      type: "membership",
      transactionId: response.CheckoutRequestID,
      phone: formattedPhone,
      status: "pending",
      description,
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

    if (!callbackData.Body.stkCallback) {
      return res.status(400).json({ message: "Invalid callback data" });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } =
      callbackData.Body.stkCallback;

    const payment = await Payment.findOne({ transactionId: CheckoutRequestID });
    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    if (ResultCode === 0) {
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
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const user = await User.findById(payment.user);
      if (user) {
        const membership = await Membership.create({
          user: user._id,
          plan,
          price: payment.amount,
          endDate,
          paymentStatus: "paid",
          features:
            plan === "Pro"
              ? ["Basic Support", "5 Listings"]
              : plan === "Premium"
              ? ["Priority Support", "Unlimited Listings"]
              : [],
        });

        user.membership = membership._id;
        await user.save();
      }
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

    const payment = await Payment.findOne({
      transactionId: checkoutRequestID,
      user: userId,
      type: "membership",
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    if (payment.status === "completed" || payment.status === "failed") {
      return res.json({
        status: payment.status,
        receipt: payment.mpesaReceiptNumber,
        plan: payment.description
          .replace("Upgrade to ", "")
          .replace(" plan", ""),
        updatedAt: payment.updatedAt,
      });
    }

    const mpesaResponse = await checkMpesaPaymentStatus(checkoutRequestID);

    if (mpesaResponse.ResultCode === "0") {
      payment.status = "completed";
      payment.mpesaReceiptNumber = mpesaResponse.MpesaReceiptNumber;
      await payment.save();

      const plan = payment.description
        .replace("Upgrade to ", "")
        .replace(" plan", "");
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const membership = await Membership.create({
        user: userId,
        plan,
        price: payment.amount,
        endDate,
        paymentStatus: "paid",
        features:
          plan === "Pro"
            ? ["Basic Support", "5 Listings"]
            : plan === "Premium"
            ? ["Priority Support", "Unlimited Listings"]
            : [],
      });

      await User.findByIdAndUpdate(userId, { membership: membership._id });

      return res.json({
        status: "completed",
        receipt: mpesaResponse.MpesaReceiptNumber,
        plan,
      });
    } else if (mpesaResponse.ResultCode !== "0") {
      payment.status = "failed";
      payment.failureReason = mpesaResponse.ResultDesc;
      await payment.save();

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
