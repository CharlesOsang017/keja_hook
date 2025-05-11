import mongoose from "mongoose";

const recommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
    type: {
      type: String,
      enum: ["view", "favorite"],
      default: "view",
    },
  },
  { timestamps: true }
);

const Recommendation = mongoose.model("Recommendation", recommendationSchema);
export default Recommendation;
