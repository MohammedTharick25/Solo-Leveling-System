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
  // We find the hunter, but we also "populate" the avatar from the User model
  const hunter = await Hunter.findOne({ userId: req.params.id })
    .select(
      "hunterName level rank title powerScore currentStreak totalQuestCompletions totalXP achievements userId",
    )
    .populate({
      path: "userId",
      select: "avatar", // Only get the avatar field from the User
    });

  if (!hunter) {
    return res
      .status(404)
      .json({ status: "error", message: "Hunter not found." });
  }

  const stats = await Stats.findOne({ userId: req.params.id });

  // Convert to object so we can move the avatar field for the frontend to find it easily
  const hunterObj = hunter.toObject();
  if (hunter.userId && hunter.userId.avatar) {
    hunterObj.avatar = hunter.userId.avatar;
  }

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
