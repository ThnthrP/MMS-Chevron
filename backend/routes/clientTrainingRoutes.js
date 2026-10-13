import express from "express";
import * as controller from "../controllers/clientTrainingController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();
router.use(userAuth);

router.get(
  "/contracts/:contractId/available-trainings",
  controller.getAvailable,
);
router.post("/contracts/:contractId/client-trainings", controller.link);
router.delete("/client-trainings/:id", controller.unlink);

export default router;
