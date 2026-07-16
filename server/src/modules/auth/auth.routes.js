import { Router } from "express";
import { authRateLimiter } from "../../middleware/rateLimiter.middleware.js";
import { protect } from "../../middleware/auth.middleware.js";
import { asyncHandler, sendSuccess } from "../../lib/helpers.js";
import {
  register,
  registerValidators,
  login,
  loginValidators,
  refreshToken,
  logout,
  completeAwakening,
} from "./auth.controller.js";
import { claimDailyBonus } from "./auth.service.js";

const router = Router();

router.post("/register", authRateLimiter, registerValidators, register);
router.post("/login", authRateLimiter, loginValidators, login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.patch("/awakening", protect, completeAwakening);

router.post(
  "/daily-bonus",
  protect,
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const result = await claimDailyBonus(req.userId, io);
    sendSuccess(
      res,
      result,
      result.alreadyClaimed
        ? "Daily bonus already claimed today."
        : `Daily login bonus claimed! +${result.xpEarned} XP`,
    );
  }),
);
export default router;