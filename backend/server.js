import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRoute from "./routes/user.route.js";
import propertyRoute from "./routes/property.route.js";
import paymentRoute from './routes/payment.route.js'
import rentRoute from './routes/rent.route.js'
import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import leaseRoute from './routes/lease.route.js'
import recommendationsRoute from './routes/recommendations.route.js'

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
app.use("/api/users", userRoute);
app.use("/api/properties", propertyRoute);
app.use("/api/payment", paymentRoute)
app.use("/api/lease",  leaseRoute)
app.use("/api/recommendations", recommendationsRoute)
app.use("/api/rent", rentRoute)

const port = process.env.PORT || 6000;

app.listen(port, async (req) => {
  await connectDB();  
  console.log(`The app is running on port ${port}`);
});
