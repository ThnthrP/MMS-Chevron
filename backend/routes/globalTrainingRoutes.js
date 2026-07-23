import express from "express";
import * as controller from "../controllers/globalTrainingController.js";

const router = express.Router();

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

router.post("/:id/standards", controller.createStandard);
router.put("/:id/standards/:standardId", controller.updateStandard);
router.delete("/:id/standards/:standardId", controller.removeStandard);

export default router;
