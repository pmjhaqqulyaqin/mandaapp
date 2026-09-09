import { Router } from "express";
import { RaporController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// All rapor routes require staff authentication (guru / wali_kelas / admin)

// Config (Bobot & KKTP)
router.get("/config", requireStaff, RaporController.getConfig);
router.post("/config", requireStaff, RaporController.upsertConfig);

// Tujuan Pembelajaran (TP) — Dynamic count
router.get("/tp", requireStaff, RaporController.getTujuanPembelajaran);
router.post("/tp", requireStaff, RaporController.upsertTujuanPembelajaran);
router.delete("/tp/:id", requireStaff, RaporController.deleteTujuanPembelajaran);

// Nilai
router.get("/nilai", requireStaff, RaporController.getNilai);
router.post("/nilai/save", requireStaff, RaporController.saveNilai);
router.post("/nilai/lock", requireStaff, RaporController.lockNilai);
router.post("/nilai/generate-desc", requireStaff, RaporController.generateDescriptions);
router.get("/nilai/export", requireStaff, RaporController.exportCsv);

export const raporRoutes = router;
