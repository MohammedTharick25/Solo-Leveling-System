import * as shadowService from "./shadow.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";

// Controller
export const getShadows = asyncHandler(async (req, res) => {
  const shadows = await shadowService.getUserShadows(req.userId);
  sendSuccess(res, { shadows }, "Shadows retrieved.");
});

export const getShadow = asyncHandler(async (req, res) => {
  const shadow = await shadowService.getShadowById(req.params.id, req.userId);
  sendSuccess(res, { shadow }, "Shadow retrieved.");
});

export const triggerEvolutionCheck = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  await shadowService.checkShadowUnlocks(req.userId, io);
  const shadows = await shadowService.getUserShadows(req.userId);
  sendSuccess(res, { shadows }, "Evolution check complete.");
});

// Routes
const router = Router();
router.use(protect, requireAwakened);

router.get("/", getShadows);
router.get("/:id", getShadow);
router.post("/check", triggerEvolutionCheck);

export default router;
