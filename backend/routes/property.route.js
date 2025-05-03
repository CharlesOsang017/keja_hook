import express from "express";
import {
  createProperty,
  getAllProperties,
  editProperty,
  deleteProperty,
  propertyDetails,
  userProperties,
} from "../controllers/property.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/create-property", protectRoute, createProperty);
router.get("/all-properties", protectRoute, getAllProperties);
router.put("/edit-property/:id", protectRoute, editProperty);
router.delete("/delete-property/:id", protectRoute, deleteProperty);
router.get("/property/:id", protectRoute, propertyDetails);
router.get("/user-properties/:userId", protectRoute, userProperties);

export default router;
