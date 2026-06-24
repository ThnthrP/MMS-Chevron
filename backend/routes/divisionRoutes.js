import express from "express";
import * as controller from "../controllers/divisionController.js";

const router = express.Router();

router.get("/", controller.listDivisions);
router.post("/", controller.createDivision);
router.put("/:id", controller.renameDivision);
router.delete("/:id", controller.deleteDivision);

export default router;
