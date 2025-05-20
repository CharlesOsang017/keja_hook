import mongoose from "mongoose";

const investmentSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
  },
  tokens: { type: Number, required: true },
  amount: { type: Number, required: true },
  transactionHash: { type: String, required: true },
  walletAddress: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

const Investment = mongoose.model("Investment", investmentSchema);
export default Investment;
