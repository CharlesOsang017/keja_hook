import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRoute from "./routes/user.route.js";
import propertyRoute from "./routes/property.route.js";
import paymentRoute from "./routes/payment.route.js";
import rentRoute from "./routes/rent.route.js";
import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import leaseRoute from "./routes/lease.route.js";
import recommendationsRoute from "./routes/recommendations.route.js";
import cors from "cors";
import favoriteRoute from "./routes/favorite.route.js";
import Web3 from "web3";
import { ethers } from "ethers";

import advertRoute from "./routes/advert.route.js";

dotenv.config();

const app = express();

// app.use(bodyParser.json());
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Web3 provider
const web3 = new Web3(process.env.INFURA_URL);
const provider = new ethers.providers.JsonRpcProvider(process.env.INFURA_URL);

// middleware
app.use("/api/users", userRoute);
app.use("/api/properties", propertyRoute);
app.use("/api/payment", paymentRoute);
app.use("/api/lease", leaseRoute);
app.use("/api/recommendations", recommendationsRoute);
app.use("/api/rent", rentRoute);
app.use("/api/favorites", favoriteRoute);
app.use("/api/ads", advertRoute);

const port = process.env.PORT || 6000;

app.listen(port, async (req) => {
  await connectDB();
  console.log(`The app is running on port ${port}`);
});
