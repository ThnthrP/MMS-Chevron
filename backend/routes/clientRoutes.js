import express from "express";
import * as controller from "../controllers/clientController.js";

const router = express.Router();

router.get("/", controller.getClients);

export default router;
