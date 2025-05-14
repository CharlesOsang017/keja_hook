import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/token.js";
import {
  sendPasswordResetEmail,
  sendResetSuccessEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "../mailtrap/emails.js";


// @route   POST /api/users/register
// @desc   register a user
export const register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    if (!name || !email || !password || !phone) {
      return res.status(403).json({ message: "All fields are required" });
    }
    // Cheking if the user with the same email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(403).json({ message: "User already exists" });
    }
    // Hashing the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // randomly generating a verification token
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const newUser = new User({
      name,
      email,
      phone,
      verificationToken,
      password: hashedPassword,
      verificationExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    await newUser.save();
    await sendVerificationEmail(newUser?.email, verificationToken);
    return res.status(201).json({ message: "User created successfuly!" });
  } catch (error) {
    console.log("error in register controller", error.message);
  }
};

// @route   POST /api/users/login
// @desc   login a user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password"); // include password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(403).json({ message: "Invalid Credentials" });
    }

    generateTokenAndSetCookie(user._id, res);

    // remove password before sending the user back
    const { password: _, ...userData } = user._doc;
    return res.status(200).json(userData);
  } catch (error) {
    console.log("error in login controller", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
};



// @route   POST /api/users/logout
// @desc   log out a user
export const logout = async (req, res) => {
  try {
    res.cookie("token", "", { maxAge: 0 });
    return res.status(200).json({ message: "Logged Out successffully!" });
  } catch (error) {
    console.log("error in logout controller", error.message);
  }
};


// @route   GET /api/users/me
// @desc   get a login user
export const getMe = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select("-password");
    if (!me) {
      return res.status(403).json({ message: "login first" });
    }
    return res.status(200).json(me);
  } catch (error) {
    console.log("error in getMe controller", error.message);
    return res.status(500).json({ message: error.message });
  }
};


// @route   POST /api/users/verify-email
// @desc   verify the email for security purpose
export const verifyEmail = async (req, res) => {
  const { code } = req.body;
  try {
    const user = await User.findOne({
      verificationToken: code,
      verificationExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification code",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    await sendWelcomeEmail(user.email, user.name);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      user: {
        ...user._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.log("error in verifyEmail ", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// @route   POST /api/users/forgot-password
// @desc   trigger the forgot password request
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "The email does not exist" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    // send email
    await sendPasswordResetEmail(
      user.email,
      `${process.env.CLIENT_URL}/reset-password/${resetToken}`
    );

    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// @route   POST /api/users/reset-password/:token
// @desc    reset the password when you can't remember it
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    // update password
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    await sendResetSuccessEmail(user.email);

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.log("Error in resetPassword ", error);
    res.status(400).json({ success: false, message: error.message });
  }
};
