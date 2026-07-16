import * as questService from "./quest.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";

export const getQuests = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  // Pass io so auto-generation can emit socket events if quests are created
  const result = await questService.getTodaysQuests(req.userId, io);
  sendSuccess(res, result, "Today's quests retrieved.");
});

export const generateQuests = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const quests = await questService.generateQuestsForUser(req.userId, io);
  sendSuccess(
    res,
    { quests, count: quests.length },
    quests.length > 0
      ? "Daily quests generated."
      : "Quests already generated for today.",
  );
});

export const updateProgress = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const result = await questService.updateQuestProgress(
    req.params.id,
    req.userId,
    Number(req.body.value),
    io,
  );
  sendSuccess(res, result, "Quest progress updated.");
});

export const complete = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const result = await questService.completeQuest(
    req.params.id,
    req.userId,
    io,
  );
  sendSuccess(res, result, "Quest completed. The System is pleased.");
});

export const fail = asyncHandler(async (req, res) => {
  const quest = await questService.failQuest(req.params.id, req.userId);
  sendSuccess(res, { quest }, "Quest marked as failed.");
});

export const getHistory = asyncHandler(async (req, res) => {
  const result = await questService.getQuestHistory(
    req.userId,
    req.query.page,
    req.query.limit,
  );
  sendSuccess(res, result, "Quest history retrieved.");
});
