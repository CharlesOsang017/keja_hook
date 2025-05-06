import { validationResult } from "express-validator";
import Property from "../models/property.model.js";
import User from "../models/user.model.js";
import Lease from "../models/lease.model.js";

export const createLease = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      propertyId,
      tenantId,
      startDate,
      endDate,
      monthlyRent,
      paymentDueDay,
      terms,
    } = req.body;

    // Verify property exists and is available
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ msg: "Property not found" });
    }

    if (property.propertyStatus !== "available") {
      return res
        .status(400)
        .json({ msg: "Property is not available for lease" });
    }

    // Verify tenant exists
    const tenant = await User.findById(tenantId);
    if (!tenant || tenant.role !== "tenant") {
      return res.status(404).json({ msg: "Tenant not found" });
    }

    // Verify requesting user is the property owner
    if (property.owner.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ msg: "Not authorized to create lease for this property" });
    }

    // Create lease
    const lease = new Lease({
      property: propertyId,
      landlord: req.user.id,
      tenant: tenantId,
      startDate,
      endDate,
      monthlyRent,
      paymentDueDay: paymentDueDay || 1,
      terms,
    });

    await lease.save();

    // Update property status
    property.status = "rented";
    await property.save();

    res.status(201).json(lease);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
