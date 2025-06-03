import { validationResult } from "express-validator";
import Investment from "../models/investment.model.js";
import Property from "../models/property.model.js";
import User from "../models/user.model.js";
import Payment from "../models/payment.model.js"; // Assuming Payment model exists
import { lipaNaMpesaOnline, verifyMpesaPayment } from "../config/mpesa.config.js";

// @route   POST /api/investments/invest
// @desc    Initiate investment in a property
export const initiateInvestment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { propertyId, amount, phone } = req.body;
    const userId = req.user._id;

    // Verify user role
    const user = await User.findById(userId);
    if (!user || !["investor", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Only investors or admins can invest" });
    }

    // Verify membership
    const membership = await Membership.findOne({ user: userId, isActive: true });
    if (!membership || membership.plan === "Basic") {
      return res.status(403).json({
        message: "A Pro or Premium membership is required to invest",
        upgradeLink: `${process.env.BASE_URL}/api/payments/upgrade`,
      });
    }

    // Verify property
    const property = await Property.findById(propertyId);
    if (!property || property.propertyStatus !== "available") {
      return res.status(404).json({ message: "Property not found or not available" });
    }

    // Calculate investment limit (e.g., 50% of price or rentalPrice)
    const basePrice = property.type === "rental" ? property.rentalPrice : property.price;
    if (!basePrice || basePrice <= 0) {
      return res.status(400).json({ message: "Property price or rental price is invalid" });
    }
    const maxInvestmentCapacity = property.maxInvestmentCapacity || basePrice * 0.5;
    if (property.totalInvestedAmount + amount > maxInvestmentCapacity) {
      return res.status(400).json({ message: "Investment exceeds property capacity" });
    }

    // Calculate percentage return based on investment proportion
    const investmentProportion = amount / basePrice;
    let percentageReturn;
    if (investmentProportion < 0.1) {
      percentageReturn = 5; // 5% for < 10% of property value
    } else if (investmentProportion <= 0.25) {
      percentageReturn = 7; // 7% for 10-25%
    } else {
      percentageReturn = 10; // 10% for > 25%
    }

    const expectedAnnualReturn = (amount * percentageReturn) / 100;

    // Format phone for M-Pesa
    const formattedPhone = phone.replace(/^0/, "254").replace(/^\+/, "");
    const accountReference = `INVESTMENT-${propertyId}-${userId}`;
    const description = `Investment in ${property.title}`;
    const callbackUrl = `${process.env.BASE_URL}/api/investments/investment-callback`;

    const response = await lipaNaMpesaOnline(
      formattedPhone,
      amount,
      accountReference,
      description,
      callbackUrl
    );

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(startDate.getFullYear() + 1); // 1-year investment period

    // Create or update investment
    let investment = await Investment.findOne({ user: userId, property: propertyId, status: "pending" });
    if (investment) {
      investment.amount = amount;
      investment.percentageReturn = percentageReturn;
      investment.expectedAnnualReturn = expectedAnnualReturn;
      investment.transactionId = response.CheckoutRequestID;
      investment.phone = formattedPhone;
      investment.description = description;
      investment.startDate = startDate;
      investment.endDate = endDate;
    } else {
      investment = new Investment({
        user: userId,
        property: propertyId,
        amount,
        percentageReturn,
        expectedAnnualReturn,
        transactionId: response.CheckoutRequestID,
        phone: formattedPhone,
        description,
        startDate,
        endDate,
        status: "pending",
      });
    }

    await investment.save();

    // Create Payment record (assuming required by M-Pesa integration)
    await Payment.create({
      user: userId,
      transactionId: response.CheckoutRequestID,
      amount,
      phone: formattedPhone,
      status: "pending",
      description,
    });

    res.json({
      message: `Investment of ${amount} initiated for property ${property.title}`,
      checkoutRequestID: response.CheckoutRequestID,
    });
  } catch (err) {
    console.error("Investment initiation error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   POST /api/investments/investment-callback
// @desc    Handle M-Pesa callback for investment payment
export const investmentCallback = async (req, res) => {
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

    if (payment.status === "completed" || payment.status === "failed") {
      return res.status(200).json({ message: "Callback already processed" });
    }

    const investment = await Investment.findOne({ transactionId: CheckoutRequestID });
    if (!investment) {
      return res.status(404).json({ message: "Investment not found" });
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

      investment.status = "confirmed";
      investment.mpesaReceiptNumber = metadata.MpesaReceiptNumber;
      await investment.save();

      // Update property's total invested amount
      const property = await Property.findById(investment.property);
      if (property) {
        property.totalInvestedAmount += investment.amount;
        await property.save();
      }

      // Ensure user membership reference (optional, as already set)
      await User.findByIdAndUpdate(investment.user, { membership: (await Membership.findOne({ user: investment.user, isActive: true }))._id });
    } else {
      payment.status = "failed";
      payment.failureReason = ResultDesc;
      await payment.save();

      investment.status = "failed";
      investment.failureReason = ResultDesc;
      await investment.save();
    }

    res.status(200).json({ message: "Callback processed successfully" });
  } catch (err) {
    console.error("Callback processing error:", err.message);
    res.status(500).json({ message: "Error processing callback" });
  }
};

// @route   GET /api/investments/verify/:checkoutRequestID
// @desc    Verify investment payment
export const verifyInvestmentPayment = async (req, res) => {
  try {
    const { checkoutRequestID } = req.params;
    const userId = req.user._id;

    const investment = await Investment.findOne({
      transactionId: checkoutRequestID,
      user: userId,
    });

    if (!investment) {
      return res.status(404).json({ message: "Investment payment not found" });
    }

    if (investment.status === "confirmed" || investment.status === "failed") {
      return res.json({
        status: investment.status,
        receipt: investment.mpesaReceiptNumber,
        amount: investment.amount,
        property: investment.property,
        updatedAt: investment.updatedAt,
      });
    }

    const mpesaResponse = await verifyMpesaPayment(checkoutRequestID);

    if (mpesaResponse.ResultCode === "0") {
      investment.status = "confirmed";
      investment.mpesaReceiptNumber = mpesaResponse.MpesaReceiptNumber;
      await investment.save();

      const property = await Property.findById(investment.property);
      if (property) {
        property.totalInvestedAmount += investment.amount;
        await property.save();
      }

      await User.findByIdAndUpdate(userId, { membership: (await Membership.findOne({ user: userId, isActive: true }))._id });

      return res.json({
        status: "confirmed",
        receipt: mpesaResponse.MpesaReceiptNumber,
        amount: investment.amount,
        property: investment.property,
      });
    } else {
      investment.status = "failed";
      investment.failureReason = mpesaResponse.ResultDesc;
      await investment.save();

      return res.json({
        status: "failed",
        reason: mpesaResponse.ResultDesc,
      });
    }
  } catch (err) {
    console.error("Payment verification error:", err.message);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

// @route   GET /api/investments
// @desc    Get all investments for a user
export const getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id })
      .populate("property", "title price rentalPrice type")
      .populate("user", "name email");
    res.status(200).json(investments);
  } catch (err) {
    console.error("Error fetching investments:", err.message);
    res.status(500).json({ message: "Error fetching investments" });
  }
};