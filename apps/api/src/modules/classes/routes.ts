import { Router } from "express";
import { ClassController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Public - needed for student forms/dropdowns
router.get("/", ClassController.getAll);
router.get("/:id", ClassController.getById);

// Protected (staff only)
router.post("/", requireStaff, ClassController.create);
router.put("/:id", requireStaff, ClassController.update);
router.delete("/:id", requireStaff, ClassController.delete);

// Slot Availability (Waktu Kosong Kelas)
router.get("/:id/slot-availability", requireStaff, ClassController.getSlotAvailability);
router.post("/:id/slot-availability/bulk", requireStaff, ClassController.bulkSetSlotAvailability);
router.post("/:id/slot-availability/set-all", requireStaff, ClassController.setAllAvailable);

export default router;
