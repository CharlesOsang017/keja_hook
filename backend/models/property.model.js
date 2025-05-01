import mongoose, { model } from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
    },
    price: {
      type: Number,
      trim: true,
    },
    bedrooms: {
      type: Number,
      required: true,
      trim: true,
    },
    bathrooms: {
      type: Number,
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    images: [String],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["apartment", "villa", "condo", "house"],
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "rented", "sold"],
      default: "available",
    },
  },
  { timestamps: true }
);

const Property = mongoose.model("Property", propertySchema);
export default Property;
