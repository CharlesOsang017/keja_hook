import Membership from "../models/membership.model.js";
import Property from "../models/property.model.js";
import { v2 as cloudinary } from "cloudinary";

// @route   POST /api/properties/create-property
// @desc   Create the property 
export const createProperty = async (req, res) => {
  const {
    title,
    description,
    price,
    location,
    bathrooms,
    bedrooms,
    propertyType,
    rentalPrice,
    type,
  } = req.body;
  let { images } = req.body;
  const userId = req.user?._id;

  try {    
    if (!title || !description || !location || !propertyType) {
      return res.status(403).json({ message: "All fields are required" });
    }
    // Check if user is a landlord
    if (req.user.role !== "landlord") {
      return res
        .status(403)
        .json({ message: "You are not authorized to create a property" });
    }

    // Check user's membership plan
    const membership = await Membership.findOne({
      user: userId,
      isActive: true,
    });
    if (!membership) {
      return res.status(403).json({
        message: "No active membership found. Please subscribe to a plan.",
      });
    }

    // Check property limit for Basic plan
    if (membership.plan === "Basic") {
      const propertyCount = await Property.countDocuments({ owner: userId });
      if (propertyCount >= 3) {
        return res.status(403).json({
          message:
            "You have reached the maximum limit of 4 properties for the Basic plan.",          
        });
      }
    }
    // multiple [5] images upload using cloudinary
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
      bathrooms,
      bedrooms,
      propertyType,
      location,
      rentalPrice,
      images: uploadedImages,
      type,
    });

    await newProperty.save();
    return res.status(201).json({ message: "property created successffully!" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/properties/all-properties
// @desc   All property listings 
export const getAllProperties = async (req, res) => {
  try {
    const allProperties = await Property.find()
      .sort({ createdAt: -1 })
      .populate({ path: "owner", select: "-password" });
    return res.status(200).json(allProperties);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/properties/edit-property/:id
// @desc   Edit the property 
export const editProperty = async (req, res) => {
  const {
    title,
    description,
    price,
    rentalPrice,
    location,
    bathrooms,
    bedrooms,
    status,
    type,
  } = req.body;
  let { images } = req.body;

  try {
    const owner = req.user;
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (!property.owner?.equals(owner._id) && req.user.role !== "landlord") {
      return res
        .status(403)
        .json({ message: "You are not the owner of this property" });
    }

    // Handle image update functionality
    if (images) {
      // Delete old Cloudinary images
      if (Array.isArray(property.images)) {
        for (const oldImage of property.images) {
          try {
            const publicId = oldImage.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (err) {
            console.warn("Failed to delete old image:", err.message);
          }
        }
      }

      // Upload new images
      const uploadedImages = [];

      if (Array.isArray(images)) {
        for (const image of images) {
          const uploadResponse = await cloudinary.uploader.upload(image);
          uploadedImages.push(uploadResponse.secure_url);
        }
      } else if (typeof images === "string") {
        const uploadResponse = await cloudinary.uploader.upload(images);
        uploadedImages.push(uploadResponse.secure_url);
      }

      property.images = uploadedImages;
    }

    // Update other fields only if provided
    if (title) property.title = title;
    if (description) property.description = description;
    if (location) property.location = location;
    if (price) property.price = price;
    if (bedrooms) property.bedrooms = bedrooms;
    if (bathrooms) property.bathrooms = bathrooms;
    if (status) property.status = status;
    if (rentalPrice) property.rentalPrice = rentalPrice;
    if (type) property.type = type;

    if (typeof isAvailable === "boolean") property.isAvailable = isAvailable;

    await property.save();
    console.log("token", req.cookies.jwt);

    return res
      .status(200)
      .json({ message: "Property Updated Successfully", property });
  } catch (error) {
    console.error("Edit Property Error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/properties/delete-property/:id
// @desc   Delete the property 
export const deleteProperty = async (req, res) => {
  const { id } = req.params;

  try {
    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Check ownership
    if (!property.owner?.equals(req.user._id) && req.user.role !== "landlord") {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this property" });
    }

    //  Delete each image from Cloudinary
    if (Array.isArray(property.images)) {
      for (const image of property.images) {
        try {
          const imageId = image.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(imageId);
        } catch (err) {
          console.warn(`Failed to delete image ${image}:`, err.message);
        }
      }
    }

    //  Delete property from the Database
    await Property.findByIdAndDelete(id);

    return res.status(200).json({ message: "Property deleted successfully!" });
  } catch (error) {
    console.error("Error in deleteProperty controller:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/properties/property/:id
// @desc   Property details 
export const propertyDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const property = await Property.findById(id).populate({
      path: "owner",
      select: "-password",
    });
    return res.status(200).json(property);
  } catch (error) {
    console.log("error in getProperty details controller", error.message);
    return res.status(500).json({ message: error.message });
  }
};
