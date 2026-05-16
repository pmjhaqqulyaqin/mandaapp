import { Router } from "express";
import { KbmController } from "./controller";
import { requireStaff } from "../auth/middleware";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All KBM routes require staff authentication

// Subjects (Mapel)
router.get("/subjects", requireStaff, KbmController.getSubjects);
router.post("/subjects", requireStaff, KbmController.createSubject);
router.put("/subjects/:id", requireStaff, KbmController.updateSubject);
router.delete("/subjects/:id", requireStaff, KbmController.deleteSubject);
router.post("/subjects/seed", requireStaff, KbmController.seedSubjects);

// Distribusi Jam
router.get("/distribusi", requireStaff, KbmController.getDistribusi);
router.post("/distribusi/upsert", requireStaff, KbmController.upsertDistribusi);
router.post("/distribusi/bulk", requireStaff, KbmController.bulkUpsertDistribusi);
router.delete("/distribusi/:id", requireStaff, KbmController.deleteDistribusi);
router.get("/distribusi/summary", requireStaff, KbmController.getJtmSummary);
router.get("/distribusi/export", requireStaff, KbmController.exportDistribusi);
router.get("/distribusi/template", requireStaff, KbmController.downloadTemplate);
router.post("/distribusi/import", requireStaff, upload.single('file'), KbmController.importDistribusi);
router.post("/distribusi/copy", requireStaff, KbmController.copyDistribusi);

// Tugas Tambahan Master
router.get("/tugas-master", requireStaff, KbmController.getTugasMaster);
router.post("/tugas-master", requireStaff, KbmController.createTugasMaster);
router.put("/tugas-master/:id", requireStaff, KbmController.updateTugasMaster);
router.delete("/tugas-master/:id", requireStaff, KbmController.deleteTugasMaster);
router.post("/tugas-master/seed", requireStaff, KbmController.seedTugasMaster);

// Tugas Tambahan (Assignment)
router.get("/tugas", requireStaff, KbmController.getTugas);
router.post("/tugas", requireStaff, KbmController.createTugas);
router.put("/tugas/:id", requireStaff, KbmController.updateTugas);
router.delete("/tugas/:id", requireStaff, KbmController.deleteTugas);
router.get("/tugas/export", requireStaff, KbmController.exportTugas);
router.get("/tugas/template", requireStaff, KbmController.downloadTugasTemplate);
router.post("/tugas/import", requireStaff, upload.single('file'), KbmController.importTugas);

// Ruangan
router.get("/ruangan", requireStaff, KbmController.getRuangan);
router.post("/ruangan", requireStaff, KbmController.createRuangan);
router.put("/ruangan/:id", requireStaff, KbmController.updateRuangan);
router.delete("/ruangan/:id", requireStaff, KbmController.deleteRuangan);
router.post("/ruangan/seed", requireStaff, KbmController.seedRuangan);

// Jadwal (Phase 2 — Auto Scheduler)
router.get("/jadwal", requireStaff, KbmController.getJadwal);
router.post("/jadwal/generate", requireStaff, KbmController.generateJadwal);
router.put("/jadwal/:id", requireStaff, KbmController.moveSlot);
router.delete("/jadwal/:id", requireStaff, KbmController.deleteJadwalSlot);
router.post("/jadwal/clear", requireStaff, KbmController.clearJadwal);
router.get("/jadwal/conflicts", requireStaff, KbmController.checkConflicts);
router.post("/jadwal/sync", requireStaff, KbmController.syncToJurnal);
router.get("/jadwal/export", requireStaff, KbmController.exportJadwal);

// Kode Guru
router.get("/guru-kode", requireStaff, KbmController.getGuruKode);
router.put("/guru-kode/:id", requireStaff, KbmController.updateGuruKode);
router.post("/guru-kode/bulk", requireStaff, KbmController.bulkUpdateGuruKode);
router.post("/guru-kode/auto", requireStaff, KbmController.autoAssignGuruKode);

// Dashboard
router.get("/dashboard", requireStaff, KbmController.getDashboard);

export const kbmRoutes = router;
