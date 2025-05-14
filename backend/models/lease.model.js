import mongoose from "mongoose";

const leaseSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  monthlyRent: {
    type: Number,
    required: true,
  },
  paymentDueDay: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ["active", "terminated", "completed"],
    default: "active",
  },
  paymentHistory: [
    {
      amount: Number,
      paymentDate: Date,
      transactionId: String,
      paymentMethod: String,
      paymentStatus: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: 'pending'
      },
    },
  ],
  terms: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Lease = mongoose.model("Lease", leaseSchema);
export default Lease;
