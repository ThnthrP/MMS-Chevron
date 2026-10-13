import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  requireAdmin,
  listAuditLogs,
  getAuditFilters,
  exportAuditLogs,
  getAuditLog,
} from "../controllers/auditLogController.js";

const router = express.Router();

router.use(userAuth, requireAdmin);

router.get("/", listAuditLogs);
router.get("/filters", getAuditFilters);
router.get("/export", exportAuditLogs); // ต้องอยู่ก่อน "/:id"
router.get("/:id", getAuditLog);

export default router;
