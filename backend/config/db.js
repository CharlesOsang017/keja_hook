import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("successfully connected to the Database");
  } catch (error) {
    console.log("error connecting to Db", error.message);
  }
};
