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
router.post("/distribusi/guru-subjects", requireStaff, KbmController.syncGuruSubjects);
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

// Guru Unavailability (Hari Kosong Guru)
router.get("/guru-unavailability", requireStaff, KbmController.getGuruUnavailability);
router.post("/guru-unavailability", requireStaff, KbmController.createGuruUnavailability);
router.delete("/guru-unavailability/:id", requireStaff, KbmController.deleteGuruUnavailability);
router.post("/guru-unavailability/bulk", requireStaff, KbmController.bulkSetGuruUnavailability);

// Guru Slot Availability (Per Hari × Jam)
router.get("/guru-slot-availability", requireStaff, KbmController.getGuruSlotAvailability);
router.post("/guru-slot-availability/bulk", requireStaff, KbmController.bulkSetGuruSlotAvailability);
router.post("/guru-slot-availability/migrate", requireStaff, KbmController.migrateSlotAvailability);
router.post("/guru-slot-availability/set-all", requireStaff, KbmController.setAllGuruSlotsAvailable);

// Schedule Config
router.get("/schedule-config", requireStaff, KbmController.getScheduleConfig);
router.post("/schedule-config", requireStaff, KbmController.upsertScheduleConfig);

// Jadwal (Phase 2 — Auto Scheduler)
router.get("/jadwal", requireStaff, KbmController.getJadwal);
router.post("/jadwal/generate", requireStaff, KbmController.generateJadwal);
router.get("/jadwal/generate-stream", requireStaff, KbmController.generateJadwalStream);
router.put("/jadwal/:id", requireStaff, KbmController.moveSlot);
router.get("/jadwal/check-move", requireStaff, KbmController.checkMoveSlot);
router.post("/jadwal/swap", requireStaff, KbmController.swapSlots);
router.delete("/jadwal/:id", requireStaff, KbmController.deleteJadwalSlot);
router.post("/jadwal/clear", requireStaff, KbmController.clearJadwal);
router.get("/jadwal/conflicts", requireStaff, KbmController.checkConflicts);
router.get("/jadwal/score", requireStaff, KbmController.scoreJadwal);
router.get("/jadwal/available-slots", requireStaff, KbmController.findAvailableSlots);
router.post("/jadwal/manual-place", requireStaff, KbmController.manualPlaceBlock);
router.post("/jadwal/sync", requireStaff, KbmController.syncToJurnal);
router.get("/jadwal/export", requireStaff, KbmController.exportJadwal);
router.get("/jadwal/export-grid", requireStaff, KbmController.exportJadwalGrid);
router.get("/jadwal/template", requireStaff, KbmController.downloadJadwalTemplate);
router.post("/jadwal/import", requireStaff, upload.single('file'), KbmController.importJadwal);

// Versioning
router.get("/jadwal/versions", requireStaff, KbmController.listVersions);
router.post("/jadwal/versions/:id/activate", requireStaff, KbmController.activateVersion);
router.put("/jadwal/versions/:id", requireStaff, KbmController.renameVersion);
router.delete("/jadwal/versions/:id", requireStaff, KbmController.deleteVersion);

// Kode Guru
router.get("/guru-kode", requireStaff, KbmController.getGuruKode);
router.put("/guru-kode/:id", requireStaff, KbmController.updateGuruKode);
router.post("/guru-kode/bulk", requireStaff, KbmController.bulkUpdateGuruKode);
router.post("/guru-kode/auto", requireStaff, KbmController.autoAssignGuruKode);

// Dashboard
router.get("/dashboard", requireStaff, KbmController.getDashboard);

// Scheduling Rules (Aturan Jadwal)
router.get("/scheduling-rules", requireStaff, KbmController.getSchedulingRules);
router.post("/scheduling-rules", requireStaff, KbmController.createSchedulingRule);
router.put("/scheduling-rules/:id", requireStaff, KbmController.updateSchedulingRule);
router.delete("/scheduling-rules/:id", requireStaff, KbmController.deleteSchedulingRule);
router.put("/scheduling-rules/:id/toggle", requireStaff, KbmController.toggleSchedulingRule);

export const kbmRoutes = router;
