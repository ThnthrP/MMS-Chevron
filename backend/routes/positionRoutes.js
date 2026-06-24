import express from "express";
import * as controller from "../controllers/positionController.js";

const router = express.Router();

router.get("/", controller.getPositions);
router.get("/manage", controller.getPositionsWithCounts); // literal ก่อน /:id
router.post("/", controller.createPosition);

// ----- Matrix Editor (path 2 segment — ไม่ชนกับ /:id) -----
router.get("/:id/matrix", controller.getPositionMatrix);
router.put("/:id/matrix", controller.updatePositionMatrix);

router.get("/:id", controller.getPositionById);
router.put("/:id", controller.updatePosition);
router.delete("/:id", controller.deletePosition);

export default router;
