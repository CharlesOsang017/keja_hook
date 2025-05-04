import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    checkoutRequestId: {
      type: String,
      required: true,
    },
    merchantRequestId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    paymentFor: {
      type: String,
      enum: ["rent", "property_purchase", "service_charge", "other"],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mpesaReceitNumber: {
      type: String,
    },
  },
  { timestanps: true }
);

const Transaction = mongoose.model("Transaction", paymentSchema);
export default Transaction;
