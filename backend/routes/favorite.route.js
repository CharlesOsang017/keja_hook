import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  makeFavorite,
  removeFavorite,
  allFavorites,
} from "../controllers/favorite.controller.js";

const router = express.Router();

router.post("/", protectRoute, makeFavorite);
router.delete("/:propertyId", protectRoute, removeFavorite);
router.get("/", protectRoute, allFavorites);
export default router;
