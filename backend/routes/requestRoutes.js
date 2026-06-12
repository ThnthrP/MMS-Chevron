import express from "express";
import userAuth from "../middleware/userAuth.js";
import authorize from "../middleware/authorize.js";
import { createRequest } from "../controllers/requestController.js";

const router = express.Router();

// PE create request
router.post(
  "/create",
  userAuth,
  authorize("request", "create"),
  createRequest
);

export default router;