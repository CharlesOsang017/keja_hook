import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema(
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

const Interaction = mongoose.model("Interaction", interactionSchema);
export default Interaction;
