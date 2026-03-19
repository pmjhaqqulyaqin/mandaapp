import { Router } from "express";
import { StudentController } from "./controller";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/", StudentController.getAll);
router.post("/", StudentController.create);
router.post("/upload", upload.single("file"), StudentController.uploadExcel);
router.get("/revisions", StudentController.getRevisions); // Must be before /:id
router.get("/:id", StudentController.getById);
router.put("/:id", StudentController.update);
router.post("/revisions", StudentController.createRevision);
router.put("/revisions/:id", StudentController.updateRevision);

export const studentRoutes = router;
