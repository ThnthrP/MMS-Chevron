import express from "express";

import {
  workerLogin,
  workerLogout,
  workerIsAuthenticated,
  changePin,
} from "../controllers/workerAuthController.js";

import {
  getCurrentJob,
  getPendingConfirmation,
  confirmJob,
  rejectJob,
  getJobHistory,
  getJobTimeline,
  getConfirmedJobs,
} from "../controllers/workerJobsController.js";

import {
  createLeaveRequest,
  getMyLeaveRequests,
  cancelLeaveRequest,
} from "../controllers/workerLeaveController.js";

import workerAuth from "../middleware/workerAuth.js";

import { getReadiness } from "../controllers/workerReadinessController.js";

import { uploadLeaveAttachmentMiddleware } from "../middleware/uploadLeaveAttachmentMiddleware.js";

const workerAppRouter = express.Router();

// =====================================================
// Auth
// =====================================================
workerAppRouter.post("/auth/login", workerLogin);
workerAppRouter.post("/auth/logout", workerLogout);
workerAppRouter.get("/auth/is-auth", workerAuth, workerIsAuthenticated);
workerAppRouter.post("/auth/change-pin", workerAuth, changePin);

// =====================================================
// Jobs (ทุก route ต้องผ่าน workerAuth — scoped ด้วย req.employeeId เท่านั้น)
// =====================================================
workerAppRouter.get("/jobs/current", workerAuth, getCurrentJob);
workerAppRouter.get(
  "/jobs/pending-confirmation",
  workerAuth,
  getPendingConfirmation,
);
workerAppRouter.post("/jobs/:candidateId/confirm", workerAuth, confirmJob);
workerAppRouter.post("/jobs/:candidateId/reject", workerAuth, rejectJob);

workerAppRouter.get("/readiness", workerAuth, getReadiness);

workerAppRouter.get("/jobs/history", workerAuth, getJobHistory);
workerAppRouter.get("/jobs/:candidateId/timeline", workerAuth, getJobTimeline);

// ← ลบ route POST /leave-requests ตัวเก่า (ไม่มี multer) ออกไปแล้ว
workerAppRouter.get("/leave-requests", workerAuth, getMyLeaveRequests);

workerAppRouter.get("/jobs/confirmed", workerAuth, getConfirmedJobs);

workerAppRouter.post(
  "/leave-requests",
  workerAuth,
  uploadLeaveAttachmentMiddleware.single("attachment"),
  createLeaveRequest,
);

workerAppRouter.patch(
  "/leave-requests/:id/cancel",
  workerAuth,
  cancelLeaveRequest,
);

export default workerAppRouter;
