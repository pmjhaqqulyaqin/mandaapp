import { Router } from "express";
import { StudentController } from "./controller";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/", StudentController.getAll);
router.post("/", StudentController.create);
router.get("/template", StudentController.downloadTemplate);
router.post("/upload", upload.single("file"), StudentController.uploadExcel);
router.get("/revisions", StudentController.getRevisions); // Must be before /:id
router.post("/public-search", StudentController.publicSearch); // Must be before /:id
router.get("/search-autocomplete", StudentController.autocompleteSearch); // Public: for izin siswa form
router.post("/pull-from-nis", StudentController.pullFromNIS);
router.get("/:id", StudentController.getById);
router.put("/:id", StudentController.update);
router.delete("/:id", StudentController.delete);
router.post("/revisions", StudentController.createRevision);
router.put("/revisions/:id", StudentController.updateRevision);

export const studentRoutes = router;
