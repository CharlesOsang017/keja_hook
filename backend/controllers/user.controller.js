import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/token.js";
import {
  // sendPasswordResetEmail,
  sendResetSuccessEmail,
  // sendVerificationEmail,
  // sendWelcomeEmail,
} from "../mailtrap/emails.js";
import Membership from "../models/membership.model.js";
import { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail } from "../mailtrap/send-email.js";
// import { sendEmail } from "../mailtrap/send-email.js";


// @route   POST /api/users/register
// @desc   register a user
export const register = async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  try {
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for valid role
    const allowedRoles = ["tenant", "landlord", "investor", "admin"];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Optional: Check if a membership exists with the phone number (for consistency with membership.controller.js)
    const existingMembership = await Membership.findOne({
      phone: phone.replace(/^0/, "254").replace(/^\+/, ""),
    });
    if (existingMembership) {
      return res.status(400).json({
        message: "A membership with this phone number already exists",
      });
    }

    // Hash password and generate verification token
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Create new user without membership initially
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      verificationToken,
      verificationExpiresAt: Date.now() + 3 * 60 * 1000, // expires in 3 minutes
      role: role || "tenant",
    });

    await newUser.save();

    // Create default Basic membership
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 4); // 4-days  validity for Basic plan

    const membership = new Membership({
      user: newUser._id,
      plan: "Basic",
      price: 0,
      transactionId: `FREE-${newUser._id}-${Date.now()}`,
      phone: phone.replace(/^0/, "254").replace(/^\+/, ""),
      description: "Free Basic membership for new users",
      startDate,
      endDate,
      features: [
        "Basic Support",
        "Up to 4 property listings",
        "It is only active for 4 days upon registration",
      ], // Consistent with membership.controller.js
      isActive: true,
      paymentStatus: "paid",
    });

    await membership.save();

    // Update user with membership ID
    newUser.membership = membership._id;
    await newUser.save();

    // Send verification email
    await sendVerificationEmail(newUser.email, verificationToken);  
    // const emailBody = VERIFICATION_EMAIL_TEMPLATE.replace(
    //   "{verificationCode}",
    //   verificationToken
    // );
    // const emailSubject = "Verify Your Email";

    // await sendEmail(email, emailSubject, emailBody);
    return res.status(201).json({
      message:
        "Verification email sent to your email. Please check and verify your account.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,

        membership: {
          plan: membership.plan,
          status: membership.status,
          startDate: membership.startDate,
          endDate: membership.endDate,
          features: membership.features,
        },
      },
    });
  } catch (error) {
    console.error("Error in register controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// @route   POST /api/users/login
// @desc   login a user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");
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
    res.cookie("jwt", "", { maxAge: 0 });
    return res.status(200).json({ message: "Logged Out successffully!" });
  } catch (error) {
    console.log("error in logout controller", error.message);
  }
};

// @route   GET /api/users/me
// @desc   get a logged in user
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
    user.verificationExpiresAt = undefined;
    await user.save();

    const subject = "Welcome to Keja Hook";
    // await sendWelcomeEmail(user.email, subject, user.name);

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
      `${process.env.CLIENT_URL}/reset-password/?token=${resetToken}`
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
