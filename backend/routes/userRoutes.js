import express from "express";

import userAuth from "../middleware/userAuth.js";
import authorize from "../middleware/authorize.js";

import {
  getUserData,
  updateProfile,
  updateUserRole,
  getAllRoles,
  getAllUsers,
  createUser,
  deleteUser,
  updateUserEmployee,
  getAvailableEmployees, // ← เพิ่ม
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

// Admin — เพิ่มต่อจากของเดิม
userRouter.post("/", userAuth, authorize("system", "manage"), createUser);
userRouter.delete("/:id", userAuth, authorize("system", "manage"), deleteUser);
userRouter.put(
  "/:id/employee",
  userAuth,
  authorize("system", "manage"),
  updateUserEmployee,
);
userRouter.get(
  "/available-employees",
  userAuth,
  authorize("system", "manage"),
  getAvailableEmployees,
);

export default userRouter;
