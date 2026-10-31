import express from "express";
import * as controller from "../controllers/globalTrainingController.js";

const router = express.Router();

// ── Training Sources — ต้องอยู่ก่อน "/:id" เสมอ
//    ไม่งั้น express จะจับคำว่า "sources" เป็นค่า :id ของ route ด้านล่าง ──
router.get("/sources", controller.listSources);
router.post("/sources", controller.createSource);
router.delete("/sources/:id", controller.removeSource);

router.get("/", controller.list);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

router.post("/:id/standards", controller.createStandard);
router.put("/:id/standards/:standardId", controller.updateStandard);
router.delete("/:id/standards/:standardId", controller.removeStandard);

// ── ตรวจชื่อ cert (ใบ cert แยกตามชื่อในไฟล์) + ย้ายใบที่ผูกผิด training ──
router.get("/:id/certs", controller.listCerts);
router.post("/:id/reassign-certs", controller.reassignCerts);

export default router;
