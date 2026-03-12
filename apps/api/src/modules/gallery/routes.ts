import { Router } from "express";
import { GalleryController } from "./controller";

const router = Router();

router.get("/", GalleryController.getAll);
router.post("/", GalleryController.create);
router.put("/:id", GalleryController.update);
router.delete("/:id", GalleryController.delete);

export const galleryRoutes = router;
