import { asyncHandler, sendSuccess } from "../../lib/helpers.js";
import * as aiService from "./ai.service.js";

export const chat = asyncHandler(async (req, res) => {
  const question = String(req.body.question || "").trim();
  if (!question) return res.status(400).json({ status: "error", message: "Question is required." });
  if (question.length > 1200) {
    return res.status(400).json({ status: "error", message: "Question cannot exceed 1200 characters." });
  }

  const result = await aiService.chat({ userId: req.userId, question });
  sendSuccess(res, result, "AI response generated.");
});

export const nextAction = asyncHandler(async (req, res) => {
  const result = await aiService.nextAction(req.userId);
  sendSuccess(res, result, "Next action generated.");
});

export const breakdownGoal = asyncHandler(async (req, res) => {
  const result = await aiService.breakdownGoal({
    userId: req.userId,
    goal: String(req.body.goal || "").trim(),
  });
  sendSuccess(res, result, "Goal breakdown generated.");
});
