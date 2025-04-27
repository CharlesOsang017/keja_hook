import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../utils/token.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
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
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString()
    const newUser = new User({
      name,
      email,
      vericationToken,
      password: hashedPassword,
    });
    await newUser.save();
    return res.status(201).json({ message: "User created successfuly!" });
  } catch (error) {
    console.log("error in register controller", error.message);
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    // match password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(403).json({ message: "Invalid Credentials" });
    }
    generateTokenAndSetCookie(user?._id, res);
    return res.status(200).json(user);
  } catch (error) {
    console.log("error in login controller", error.message);
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie("token", "", { maxAge: 0 });
    return res.status(200).json({ message: "Logged Out successffully!" })
  } catch (error) {
    console.log("error in logout controller", error.message);
  }
};
