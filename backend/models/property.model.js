import mongoose, { model } from "mongoose";

const propertySchema = new mongoose.Schema({
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
  location: {
    type: String,
    trim: true,
  },
  imgaes: [String],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

const Property = mongoose.model("Property", propertySchema);
export default Property;
