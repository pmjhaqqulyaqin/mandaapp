import { Router } from "express";
import { KbmController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

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

// Ruangan
router.get("/ruangan", requireStaff, KbmController.getRuangan);
router.post("/ruangan", requireStaff, KbmController.createRuangan);
router.put("/ruangan/:id", requireStaff, KbmController.updateRuangan);
router.delete("/ruangan/:id", requireStaff, KbmController.deleteRuangan);
router.post("/ruangan/seed", requireStaff, KbmController.seedRuangan);

// Dashboard
router.get("/dashboard", requireStaff, KbmController.getDashboard);

export const kbmRoutes = router;
