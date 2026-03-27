import { Router } from "express";
import { NewsController } from "./controller";

const router = Router();

router.get("/", NewsController.getAll);
router.get("/all", NewsController.getAllAdmin); // Admin route
router.post("/", NewsController.create);
router.put("/:id", NewsController.update);
router.delete("/:id", NewsController.delete);

export const newsRoutes = router;
