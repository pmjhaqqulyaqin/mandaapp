import { Router } from "express";
import { NewsController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

router.get("/summary", NewsController.getSummary); // Lightweight endpoint for landing page
router.get("/", NewsController.getAll);
router.get("/all", requireStaff, NewsController.getAllAdmin); // Admin route
router.post("/", requireStaff, NewsController.create);
router.put("/:id", requireStaff, NewsController.update);
router.delete("/:id", requireStaff, NewsController.delete);

export const newsRoutes = router;
