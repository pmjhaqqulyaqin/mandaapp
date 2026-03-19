import { Router } from "express";
import { ClassController } from "./controller";

const router = Router();

router.get("/", ClassController.getAll);
router.get("/:id", ClassController.getById);
router.post("/", ClassController.create);
router.put("/:id", ClassController.update);
router.delete("/:id", ClassController.delete);

export default router;
