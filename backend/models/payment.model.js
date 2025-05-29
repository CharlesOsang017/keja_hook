import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lease: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lease",
      default: null,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["rent", "sale", 'token', 'membership', 'partnership'],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    mpesaReceiptNumber: String,
    phone: String,
    transactionDate: Date,
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    description: String,
    completedAt: Date,
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
