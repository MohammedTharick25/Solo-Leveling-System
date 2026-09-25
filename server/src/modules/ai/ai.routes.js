import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { chat, breakdownGoal, nextAction } from "./ai.controller.js";

const router = Router();
router.use(protect, requireAwakened);

router.post("/chat", chat);
router.post("/next-action", nextAction);
router.post("/goal-breakdown", breakdownGoal);

export default router;
