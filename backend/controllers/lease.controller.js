import { validationResult } from "express-validator";
import Property from "../models/property.model.js";
import User from "../models/user.model.js";
import Lease from "../models/lease.model.js";

// @route   POST /api/leases
// @desc    Create a new lease agreement
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

// @route   GET /api/leases
// @desc    Get leases for current user
export const getLeases = async (req, res) => {
  try {
    let leases;

    if (req.user.role === "landlord") {
      leases = await Lease.find({ landlord: req.user._id })
        .populate("tenant", "name email phone")
        .populate("property", "title location price");
    } else if (req.user.role === "tenant") {
      leases = await Lease.find({ tenant: req.user.id })
        .populate("landlord", "name email phone")
        .populate("property", "title location price");
    } else {
      return res.status(401).json({ msg: "Not authorized" });
    }

    return res.status(200).json(leases);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @route   GET /api/leases/:id
// @desc    Get lease by ID
export const getDetailLease = async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id)
      .populate("tenant", "name email phone")
      .populate("landlord", "name email phone")
      .populate("property", "title location price");
    if (!lease) {
      return res.status(404).json({ message: "Lease not found" });
    }
    // Verify requesting user is either landlord or tenant for this lease
    if (
      lease.landlord._id.toString() !== req.user.id &&
      lease.tenant._id.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: "Not authorized" });
    }
    return res.status(200).json(lease);
  } catch (error) {
    console.log("error in getDetailLease controller", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// @route   PUT /api/leases/:id
// @desc    Update lease agreement
export const updateLease = async (req, res) => {
  try {
    let lease = await Lease.findById(req.params.id);
    if (!lease) {
      return res.status(404).json({ message: "lease not found" });
    }
    // Verify requesting user is the landlord for this lease
    if (lease.landlord.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    lease = await Lease.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate("tenant landlord property");
    return res.status(200).json({ message: "lease updated successfully!" });
  } catch (error) {
    console.log("error in update lease controller", error.message);
    return res.status(500).json({ message: error.message });
  }
};
