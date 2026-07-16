import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import {
  checkAndAwardAchievements,
  getAchievements,
} from "./achievement.service.js";

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getAchievements(req.userId);
    sendSuccess(res, data, "Achievements retrieved.");
  }),
);

router.post(
  "/check",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const newOnes = await checkAndAwardAchievements(req.userId, io);
    sendSuccess(
      res,
      { newAchievements: newOnes, count: newOnes.length },
      "Achievement check complete.",
    );
  }),
);

export default router;
