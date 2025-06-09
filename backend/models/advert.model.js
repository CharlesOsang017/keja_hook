import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema(
  {
    advertiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String, 
    },
    link: {
      type: String, // Redirect URL
      trim: true,
    },
    adType: {
      type: String,
      enum: ["banner", "sidebar", "popup"],
      default: "banner",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Advertisement = mongoose.model("Advertisement", advertisementSchema);
export default Advertisement;
