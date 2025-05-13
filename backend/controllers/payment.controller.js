import { lipaNaMpesaOnline, verifyMpesaPayment } from "../config/mpesa.config.js";
import Lease from "../models/lease.model.js";
import Property from "../models/property.model.js";
import TokenizedAsset from "../models/tokenizedAsset.model.js";
import {validationResult} from "express-validator";

// @route   POST /api/payments/rent
// @desc    Initiate rent payment via M-Pesa
export const initiateRentPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { leaseId, phone } = req.body;

    const lease = await Lease.findById(leaseId).populate("tenant property");

    if (!lease) {
      return res.status(404).json({ message: "Lease not found" });
    }

    // Verify the requesting user is the tenant
    if (lease.tenant._id.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ message: "Not authorized to make this payment" });
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phone.startsWith("0")
      ? `254${phone.substring(1)}`
      : phone;
    formattedPhone = formattedPhone.startsWith("+")
      ? formattedPhone.substring(1)
      : formattedPhone;

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

    // Save payment initiation details
    lease.paymentHistory.push({
      amount,
      paymentDate: new Date(),
      transactionId: response.CheckoutRequestID,
      paymentMethod: "mpesa",
      status: "pending",
      transactionDesc
     
    });

    await lease.save();

    res.json({
      message: "Payment initiated successfully",
      checkoutRequestID: response.CheckoutRequestID,
      responseCode: response.ResponseCode,
      responseDescription: response.ResponseDescription,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @route   POST /api/payments/callback
// @desc    M-Pesa payment callback
export const mpesaCallback = async (req, res) => {
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

      // Parse account reference to get lease details
      const accountReference = metadata.find(
        (item) => item.Name === "AccountReference"
      ).Value;
      const [_, propertyId, tenantId] = accountReference.split("-");

      // Find the lease and update payment status
      const lease = await Lease.findOne({
        property: propertyId,
        tenant: tenantId,
      });

      if (lease) {
        // Find the pending payment with this checkoutRequestID
        const paymentIndex = lease.paymentHistory.findIndex(
          (payment) =>
            payment.transactionId === checkoutRequestID &&
            payment.status === "pending"
        );

        if (paymentIndex !== -1) {
          lease.paymentHistory[paymentIndex].status = "completed";
          lease.paymentHistory[paymentIndex].mpesaReceiptNumber =
            mpesaReceiptNumber;
          lease.paymentHistory[paymentIndex].paymentDate = new Date(
            transactionDate
          );

          await lease.save();

          // TODO: Send payment confirmation email/notification
        }
      }
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
