import * as bossService from "./boss.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";

export const getActiveBoss = asyncHandler(async (req, res) => {
  const boss = await bossService.getActiveBoss(req.userId);
  sendSuccess(res, { boss }, boss ? "Active boss found." : "No active boss.");
});

export const getDefeated = asyncHandler(async (req, res) => {
  const bosses = await bossService.getDefeatedBosses(req.userId);
  sendSuccess(res, { bosses }, "Defeated bosses retrieved.");
});

export const completeChallenge = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const result = await bossService.completeBossChallenge(
    req.params.bossId,
    req.params.challengeId,
    req.userId,
    io,
  );
  sendSuccess(
    res,
    result,
    result.defeated ? "Boss defeated!" : "Challenge completed.",
  );
});

const router = Router();
router.use(protect, requireAwakened);

router.get("/active", getActiveBoss);
router.get("/defeated", getDefeated);
router.patch("/:bossId/challenges/:challengeId/complete", completeChallenge);

export default router;
