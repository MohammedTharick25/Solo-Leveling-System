import { asyncHandler, sendSuccess } from "../../lib/helpers.js";
import * as goalService from "./goal.service.js";

export const getGoals = asyncHandler(async (req, res) => {
  const goals = await goalService.listGoals(req.userId);
  sendSuccess(res, { goals }, "Goals retrieved.");
});

export const createGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.createGoal(req.userId, req.body);
  sendSuccess(res, { goal }, "Goal created.", 201);
});

export const updateGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.updateGoal(req.params.id, req.userId, req.body);
  sendSuccess(res, { goal }, "Goal updated.");
});

export const deleteGoal = asyncHandler(async (req, res) => {
  await goalService.deleteGoal(req.params.id, req.userId);
  sendSuccess(res, null, "Goal deleted.");
});

export const planGoal = asyncHandler(async (req, res) => {
  const goal = await goalService.planGoal(req.params.id, req.userId);
  sendSuccess(res, { goal }, "Goal plan created.");
});

export const addQuestFromGoal = asyncHandler(async (req, res) => {
  const result = await goalService.addQuestFromGoal(
    req.params.id,
    req.userId,
    req.body.milestoneId,
    req.body.goalQuestId,
  );
  sendSuccess(res, result, result.alreadyAdded ? "Quest is already in your missions." : "Quest added to today's missions.");
});
