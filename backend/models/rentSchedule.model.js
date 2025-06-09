import mongoose from "mongoose";

const rentScheduleSchema = new mongoose.Schema({
  property: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
  },
  tenant: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const RentSchedule = mongoose.model("RentSchedule", rentScheduleSchema);
export default RentSchedule;
