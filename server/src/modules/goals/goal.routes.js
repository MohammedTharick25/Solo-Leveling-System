import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { getGoals, createGoal, updateGoal, deleteGoal, planGoal, addQuestFromGoal } from "./goal.controller.js";

const router = Router();
router.use(protect, requireAwakened);

router.get("/", getGoals);
router.post("/", createGoal);
router.patch("/:id", updateGoal);
router.delete("/:id", deleteGoal);
router.post("/:id/plan", planGoal);
router.post("/:id/quests", addQuestFromGoal);

export default router;
