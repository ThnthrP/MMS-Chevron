import express from "express";

import {
  register,
  login,
  logout,
  isAuthenticated,
  sendResetOtp,
  resetPassword,
} from "../controllers/authController.js";

import userAuth from "../middleware/userAuth.js";

const authRouter = express.Router();

// =====================================================
// Authentication
// =====================================================

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", logout);

authRouter.get("/is-auth", userAuth, isAuthenticated);

// =====================================================
// Password Reset
// =====================================================

authRouter.post("/send-reset-otp", sendResetOtp);
authRouter.post("/reset-password", resetPassword);

export default authRouter;
