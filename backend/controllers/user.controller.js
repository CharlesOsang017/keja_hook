import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

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
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });
    await newUser.save()
    return res.status(201).json({ message: "User created successfuly!" });
  } catch (error) {
    console.log("error in register controller", error.message);
  }
};
