import { initiateTokenization } from "../controllers/blockchain.controller.js"
import express from "express"
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router()

router.post("/tokenize/:propertyId", protectRoute, initiateTokenization )

export default router