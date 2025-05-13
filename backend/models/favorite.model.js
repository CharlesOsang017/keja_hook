import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  favoriteProperties: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
  },
});
const Favorites = mongoose.model("Favorites", favoriteSchema);
export default Favorites;
