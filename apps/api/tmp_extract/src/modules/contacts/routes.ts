import { Router } from "express";
import { ContactController } from "./controller";

const router = Router();

router.get("/", ContactController.getAll); // Admin
router.post("/", ContactController.submit); // Public

export const contactsRoutes = router;
