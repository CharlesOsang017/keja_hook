import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
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
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      // unique: true,
      required: true,
    },
    phone: {
      type: String,
      // unique: true,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
    },
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,
    verificationToken: String,
    verificationExpiresAt: Date,
    role: {
      type: String,
      enum: ["tenant", "landlord", "investor", "admin"],
      default: "tenant",
    },
    blockchainAddress: { type: String },
  },

  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
