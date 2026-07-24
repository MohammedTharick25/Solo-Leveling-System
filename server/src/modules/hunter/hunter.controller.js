import * as hunterService from "./hunter.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { projectFutureSelf } from "../../lib/xpFormulas.js";
import Hunter from "./hunter.model.js";
import Stats from "../stats/stats.model.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  const { hunter, stats } = await hunterService.getHunterProfile(req.userId);
  sendSuccess(res, { hunter, stats }, "Hunter profile retrieved.");
});

export const getPublicCard = asyncHandler(async (req, res) => {
  // 1. Add 'avatar' to the select string
  const hunter = await Hunter.findOne({ userId: req.params.id }).select(
    "hunterName level rank title powerScore currentStreak totalQuestCompletions totalXP achievements avatar userId",
  );

  if (!hunter) {
    return res
      .status(404)
      .json({ status: "error", message: "Hunter not found." });
  }

  // 2. Fetch the Stats document so the radar has data
  const stats = await Stats.findOne({ userId: req.params.id });

  // 3. Send both hunter and stats
  sendSuccess(res, { hunter, stats }, "Hunter card retrieved.");
});

export const equipTitle = asyncHandler(async (req, res) => {
  const hunter = await hunterService.equipTitle(req.userId, req.body.title);
  sendSuccess(res, { hunter }, "Title equipped.");
});

export const getFutureSelf = asyncHandler(async (req, res) => {
  const hunter = await Hunter.findOne({ userId: req.userId });
  const projections = [30, 60, 90, 180, 365].map((days) =>
    projectFutureSelf(hunter, null, days),
  );
  sendSuccess(res, { projections }, "Future self projections calculated.");
});
