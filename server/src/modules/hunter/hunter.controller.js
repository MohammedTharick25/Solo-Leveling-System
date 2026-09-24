import * as hunterService from "./hunter.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { projectFutureSelf } from "../../lib/xpFormulas.js";
import Hunter from "./hunter.model.js";
import Stats from "../stats/stats.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  const { hunter, stats } = await hunterService.getHunterProfile(req.userId);
  sendSuccess(res, { hunter, stats }, "Hunter profile retrieved.");
});

export const getPublicCard = asyncHandler(async (req, res) => {
  const hunter = await Hunter.findOne({ userId: req.params.id })
    .select(
      "hunterName level rank title powerScore currentStreak totalQuestCompletions totalXP achievements userId",
    )
    .populate({
      path: "userId",
      select: "avatar bio country settings",
    });

  if (!hunter) throw new AppError("Hunter not found.", 404);

  const privacy = hunter.userId?.settings?.privacy || {};
  if (privacy.publicProfile === false) {
    throw new AppError("This Hunter profile is private.", 403);
  }

  const stats = privacy.showPublicStats === false
    ? null
    : await Stats.findOne({ userId: req.params.id });
  const hunterObj = hunter.toObject();

  if (hunter.userId?.avatar) hunterObj.avatar = hunter.userId.avatar;
  hunterObj.bio = hunter.userId?.bio || "";
  hunterObj.country = hunter.userId?.country || "";
  hunterObj.achievements = privacy.showPublicAchievements === false ? [] : hunterObj.achievements;

  delete hunterObj.userId;

  sendSuccess(res, { hunter: hunterObj, stats }, "Hunter card retrieved.");
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
