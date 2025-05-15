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
      return res.status(400).json({ message: "Property unavailable for purchase" });
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
    if (callback.ResultCode !== 0) return res.json({ ResultCode: 0, ResultDesc: "Failed payment ignored" });

    const meta = callback.CallbackMetadata.Item;
    const get = name => meta.find(i => i.Name === name)?.Value;

    const transactionId = callback.CheckoutRequestID;
    const amount = get("Amount");
    const receipt = get("MpesaReceiptNumber");
    const accountRef = get("AccountReference");
    const [type, refId, userId] = accountRef.split("-");

    const payment = await Payment.findOne({ transactionId });
    if (!payment) return res.status(404).json({ ResultCode: 1, ResultDesc: "Payment not found" });

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
          transactionHash: receipt
        });
      }
    }

    if (type === "sale") {
      await SaleTransaction.create({
        buyer: userId,
        property: refId,
        amount,
        status: "paid",
        transactionDate: new Date()
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
