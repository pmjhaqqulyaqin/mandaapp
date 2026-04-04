import { Router } from "express";
import { EventController } from "./controller";

const router = Router();

router.get("/", EventController.getAll);
router.get("/range", EventController.getByRange);
router.get("/years", EventController.getYears);
router.post("/", EventController.create);
router.put("/:id", EventController.update);
router.delete("/:id", EventController.delete);

export const eventsRoutes = router;
