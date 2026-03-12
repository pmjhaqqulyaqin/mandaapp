import { Router } from "express";
import { StudentController } from "./controller";

const router = Router();

router.get("/", StudentController.getAll);
router.get("/revisions", StudentController.getRevisions); // Must be before /:id
router.get("/:id", StudentController.getById);
router.put("/:id", StudentController.update);
router.post("/revisions", StudentController.createRevision);
router.put("/revisions/:id", StudentController.updateRevision);

export const studentRoutes = router;
