import Property from "../models/property.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";

// Create a property
export const createProperty = async (req, res) => {
  const { title, description, price, location } = req.body;
  let { images } = req.body;
  const userId = req.user?._id;

  try {
    if (!title || !description || !price || !location) {
      return res.status(403).json({ message: "All fields are required" });
    }

    let uploadedImages = [];

    if (Array.isArray(images)) {
      for (const image of images) {
        const uploadResponse = await cloudinary.uploader.upload(image);
        uploadedImages.push(uploadResponse.secure_url);
      }
    } else if (typeof images === "string") {
      const uploadResponse = await cloudinary.uploader.upload(images);
      uploadedImages.push(uploadResponse.secure_url);
    }

    const newProperty = new Property({
      owner: userId,
      title,
      description,
      price,
      location,
      images: uploadedImages, // ✅ wrap as array
    });

    await newProperty.save();
    return res.status(201).json({ message: "Property Created Successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
