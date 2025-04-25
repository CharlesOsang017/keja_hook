import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    trim: true,
    required: true,
  },
  password: {
    type: String,
    unique: true,
    required: true,
  },
  resetToken: String,
  resetTokenExpire: Date,
  role: {
    type: String,
    enum: ["tenant", "landlord", "admin"],
    default: "tenant",
  },
});

const User = mongoose.model("user", userSchema);
export default User;
