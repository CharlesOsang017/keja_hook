import mongoose from "mongoose";

const tokenizedAssetSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
  },
  tokenId: {
    type: String,
    required: true,
    unique: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  purchasePrice: Number,
  purchaseDate: Date,
  transactionHash: String,
  isRedeemable: {
    type: Boolean,
    default: false,
  },
  metadata: Object,
});
const TokenizedAsset = mongoose.model("TokenizedAsset", tokenizedAssetSchema);
export default TokenizedAsset;
