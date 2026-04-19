import { Router } from "express";
import { ContactController } from "./controller";
import { requireStaff } from "../auth/middleware";

const router = Router();

// Public - anyone can submit contact form
router.post("/", ContactController.submit);

// Protected (staff only) - view messages
router.get("/", requireStaff, ContactController.getAll);

export const contactsRoutes = router;
