import express from "express";

import userAuth from "../middleware/userAuth.js";
import authorize from "../middleware/authorize.js";

import {
  getUserData,
  updateProfile,
  updateUserRole,
  getAllRoles,
  getAllUsers,
} from "../controllers/userController.js";

const userRouter = express.Router();

// =====================================================
// Current User
// =====================================================

userRouter.get("/data", userAuth, getUserData);

userRouter.put("/update", userAuth, updateProfile);

// =====================================================
// Admin
// =====================================================

userRouter.put(
  "/role",
  userAuth,
  authorize("system", "manage"),
  updateUserRole,
);

userRouter.get("/roles", userAuth, authorize("system", "manage"), getAllRoles);

userRouter.get("/all", userAuth, authorize("system", "manage"), getAllUsers);

export default userRouter;
