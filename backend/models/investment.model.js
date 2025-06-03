import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Investment amount must be positive"],
    },
    percentageReturn: {
      type: Number,
      required: true,
      min: [0, "Percentage return must be positive"],
    },
    expectedAnnualReturn: {
      type: Number,
      required: true,
      min: [0, "Expected annual return must be positive"],
    },
    transactionId: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: "Investment in property",
    },
  },
  { timestamps: true }
);

const Investment = mongoose.model("Investment", investmentSchema);
export default Investment;