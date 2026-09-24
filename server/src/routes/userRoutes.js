import express from "express";
import {
  register,
  login,
  updateProfile,
  logout,
  getProfile,
} from "../controllers/authController.js";
import { tokenAuth } from "../middleware/tokenAuth.js";
import { authRateLimiter } from "../middleware/authRateLimiter.js";

const router = express.Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);
router.get("/profile", tokenAuth, getProfile);
router.patch("/profile", tokenAuth, updateProfile);
export { router };
