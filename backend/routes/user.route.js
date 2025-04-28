import express from "express";
import { login, logout, register, verifyEmail } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/register", register);
router.post('/login', login)
router.post('/logout', logout)

router.post('/verify-email', verifyEmail)

export default router;
