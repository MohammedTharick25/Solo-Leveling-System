import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import {
  getQuests,
  generateQuests,
  updateProgress,
  complete,
  fail,
  getHistory,
  recover,
} from "./quest.controller.js";

const router = Router();

router.use(protect, requireAwakened);

router.get("/", getQuests);
router.post("/generate", generateQuests);
router.get("/history", getHistory);
router.post("/:id/recover", recover);
router.patch("/:id/progress", updateProgress);
router.patch("/:id/complete", complete);
router.patch("/:id/fail", fail);

export default router;
