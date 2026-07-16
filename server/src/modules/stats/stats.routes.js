import * as statsService from "./stats.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const stats = await statsService.getStats(req.userId);
    sendSuccess(res, { stats }, "Stats retrieved.");
  }),
);

router.post(
  "/recompute",
  asyncHandler(async (req, res) => {
    const stats = await statsService.computeAndSaveStats(req.userId);
    sendSuccess(res, { stats }, "Stats recomputed.");
  }),
);

router.get(
  "/history/:stat",
  asyncHandler(async (req, res) => {
    const result = await statsService.getStatHistory(
      req.userId,
      req.params.stat,
      req.query.days,
    );
    sendSuccess(res, result, "Stat history retrieved.");
  }),
);

export default router;
