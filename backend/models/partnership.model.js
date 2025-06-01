import mongoose from "mongoose";

const partnershipSchema = new mongoose.Schema({
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["financial_institution", "developer"],
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  fee: {
    type: Number,
    default: 50000, 
  },
  status: {
    type: String,
    enum: ["active", "inactive", "pending"],
    default: "pending",
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },
});

const Partnership = mongoose.model("Partnership", partnershipSchema);
export default Partnership;
