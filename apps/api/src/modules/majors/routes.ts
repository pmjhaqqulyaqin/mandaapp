import { Router } from "express";
import { MajorController } from "./controller";

const router = Router();

router.get("/", MajorController.getAll);
router.get("/:id", MajorController.getById);
router.post("/", MajorController.create);
router.put("/:id", MajorController.update);
router.delete("/:id", MajorController.delete);

export default router;
