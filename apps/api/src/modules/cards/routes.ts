import { Router } from "express";
import { CardSettingsController } from "./controller";

const router = Router();

router.get("/settings", CardSettingsController.get);
router.put("/settings", CardSettingsController.update);

export const cardsRoutes = router;
