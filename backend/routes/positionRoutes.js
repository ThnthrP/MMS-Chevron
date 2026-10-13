import express from "express";
import * as controller from "../controllers/positionController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();
router.use(userAuth);

router.get("/", controller.getPositions);
router.get("/manage", controller.getPositionsWithCounts);
router.post("/", controller.createPosition);

router.get("/:id/matrix", controller.getPositionMatrix);
router.put("/:id/matrix", controller.updatePositionMatrix);

router.get("/:id", controller.getPositionById);
router.put("/:id", controller.updatePosition);
router.delete("/:id", controller.deletePosition);

export default router;
