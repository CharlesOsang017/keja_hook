import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/user.route.js";
import propertyRoute from "./routes/property.route.js";
import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());

// cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// middleware
app.use("/api/users", userRouter);
app.use("/api/properties", propertyRoute);

const port = process.env.PORT || 6000;

app.listen(port, async (req) => {
  await connectDB();  
  console.log(`The app is running on port ${port}`);
});
