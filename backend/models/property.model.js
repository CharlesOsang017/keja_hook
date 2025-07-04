import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    rentalPrice: {
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
    propertyType: {
      type: String,
      enum: ["apartment", "house", "bed-sitter"],
      required: true,
    },
    propertyStatus: {
      type: String,
      enum: ["available", "rented", "sold", "leased"],
      default: "available",
    },
    type: {
      type: String,
      enum: ["rental", "sale", "lease"],
      default: "rental",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isTokenized: {
      type: Boolean,
      default: false,
    },
    totalTokens: {
      type: Number,
      min: 0,
    },
    availableTokens: {
      type: Number,
      min: 0,
    },    
    tokenPrice: {
      type: Number,
      min: 0,
    },
    totalInvestedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxInvestmentCapacity: {
      type: Number,
      min: 0,
    },
    contractAddress: {
      type: String,
      trim: true,
    },
    valuation: {
      type: Number,
      required: true
    },
    totalShares: {
      type: Number,
      required: true
    }
  },
  { virtualTourLink: String },
  { timestamps: true }
);

const Property = mongoose.model("Property", propertySchema);
export default Property;
