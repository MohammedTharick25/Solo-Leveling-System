import Hunter from "./hunter.model.js";
import User from "../user/user.model.js";
import Stats from "../stats/stats.model.js";
import Quest from "../quest/quest.model.js";
import {
  computeLevel,
  computeRank,
  computePowerScore,
  streakMultiplier,
} from "../../lib/xpFormulas.js";
import { createNotification } from "../notification/notification.service.js";
import { clamp } from "../../lib/helpers.js";
import { getZonedDayBounds, normalizeTimeZone } from "../../lib/timeZones.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { emitToUser } from "../../infrastructure/socket/socketManager.js";
import { recordGuildCelebration } from "../guild/guild.service.js";

/**
 * Award XP to a hunter. Handles level-ups and rank-ups.
 */
export const awardXP = async (userId, baseXP, io = null) => {
  const hunter = await Hunter.findOne({ userId });
  if (!hunter) throw new AppError("Hunter not found.", 404);

  const bonus = streakMultiplier(hunter.currentStreak);
  const xpEarned = Math.max(1, Math.floor(baseXP * bonus));

  const previousLevel = hunter.level;
  const previousRank = hunter.rank;

  hunter.totalXP += xpEarned;

  const newLevel = computeLevel(hunter.totalXP);
  const newRank = computeRank(hunter.totalXP);

  // Recalculate current-level XP from scratch
  let spent = 0;
  for (let i = 1; i < newLevel; i++)
    spent += Math.floor(100 * Math.pow(i, 1.8));
  hunter.xp = hunter.totalXP - spent;
  hunter.level = newLevel;
  hunter.rank = newRank;

  if (newLevel > previousLevel) {
    if (io)
      await emitToUser(io, userId, "system:level-up", {
        newLevel,
        previousLevel,
        xpEarned,
      }, "progression");
    await createNotification(
      userId,
      "levelUp",
      `LEVEL UP — ${newLevel}`,
      `You have advanced to Level ${newLevel}. The System acknowledges your growth.`,
      { newLevel, previousLevel },
      io,
    );
  }

  if (newRank !== previousRank) {
    const newRankTitle = `${newRank} Rank Hunter`;

    // 1. Add to unlocked titles if not already there
    if (!hunter.titles.includes(newRankTitle)) {
      hunter.titles.push(newRankTitle);
    }

    // 2. AUTO-EQUIP the new rank title if the current title is an old rank title
    // This prevents "C Rank" hunters from showing "D Rank Hunter"
    if (!hunter.title || hunter.title.toLowerCase().includes("rank hunter")) {
      hunter.title = newRankTitle;
    }

    if (io)
      await emitToUser(io, userId, "system:rank-up", { newRank, previousRank }, "progression");

    await createNotification(
      userId,
      "rankUp",
      `RANK PROMOTION — ${newRank}`,
      `You have ascended to ${newRank} Rank. The gates of power open before you.`,
      { newRank, previousRank },
      io,
    );
  }

  // Update power score
  const stats = await Stats.findOne({ userId });
  if (stats) {
    const LIFE_STATS = [
      "strength",
      "agility",
      "intelligence",
      "vitality",
      "sense",
      "discipline",
      "communication",
      "leadership",
      "creativity",
      "financialIntelligence",
      "problemSolving",
      "emotionalControl",
      "timeManagement",
    ];
    hunter.powerScore = computePowerScore(
      Object.fromEntries(LIFE_STATS.map((s) => [s, stats[s]])),
      hunter.level,
    );
  }

  await hunter.save();
  if (newLevel > previousLevel) {
    await recordGuildCelebration(userId, "milestone", `reached Hunter level ${newLevel}`, io);
  }
  if (newRank !== previousRank) {
    await recordGuildCelebration(userId, "milestone", `advanced to ${newRank} Rank`, io);
  }
  return {
    hunter,
    xpEarned,
    leveledUp: newLevel > previousLevel,
    rankedUp: newRank !== previousRank,
  };
};

/**
 * Deduct XP as a penalty (never below 0 totalXP).
 */
export const deductXP = async (userId, amount, io = null) => {
  const hunter = await Hunter.findOne({ userId });
  if (!hunter) return;

  const deduct = Math.min(amount, hunter.totalXP);
  hunter.totalXP = Math.max(0, hunter.totalXP - deduct);

  // Recalculate level after deduction
  const newLevel = computeLevel(hunter.totalXP);
  let spent = 0;
  for (let i = 1; i < newLevel; i++)
    spent += Math.floor(100 * Math.pow(i, 1.8));
  hunter.xp = hunter.totalXP - spent;
  hunter.level = newLevel;
  hunter.rank = computeRank(hunter.totalXP);

  await hunter.save();
  return deduct;
};

/**
 * Award stat gains after quest/activity completion.
 */
export const awardStatGains = async (userId, statRewards = []) => {
  if (!statRewards.length) return;
  const stats = await Stats.findOne({ userId });
  if (!stats) return;

  for (const { stat, amount } of statRewards) {
    if (stats[stat] !== undefined) {
      const newValue = clamp((stats[stat].value || 0) + amount, 0, 100);
      stats[stat].value = newValue;
      stats[stat].history.push({ value: newValue, date: new Date() });
      if (stats[stat].history.length > 90)
        stats[stat].history = stats[stat].history.slice(-90);
    }
  }
  await stats.save();
};

/**
 * ── STREAK SYSTEM ────────────────────────────────────────────────────────────
 *
 * HOW IT WORKS:
 * - Every day the system generates exactly 5 quests for the user.
 * - If the user completes ALL 5 quests before midnight → streak increases.
 * - If they miss a day, the streak pauses without an XP penalty.
 * - Streak is checked and updated by cron at midnight (checkAndUpdateStreaks).
 * - updateStreakOnQuestComplete() is called after each quest completion
 *   to detect same-day full completion and update lastActiveDate.
 */

export const updateStreakOnQuestComplete = async (userId, io = null) => {
  const [hunter, user] = await Promise.all([Hunter.findOne({ userId }), User.findById(userId).select("timezone").lean()]);
  if (!hunter) return;

  const timezone = normalizeTimeZone(user?.timezone);
  const { start: todayStart, end: todayEnd } = getZonedDayBounds(new Date(), timezone);

  // Count today's quests
  const [totalToday, completedToday] = await Promise.all([
    Quest.countDocuments({
      userId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }),
    Quest.countDocuments({
      userId,
      status: "completed",
      completedAt: { $gte: todayStart, $lte: todayEnd },
    }),
  ]);

  let returnedAfterBreak = false;

  // All quests done for today → update active date so streak persists overnight
  if (totalToday > 0 && completedToday >= totalToday) {
    const lastActiveDay = hunter.lastActiveDate ? getZonedDayBounds(hunter.lastActiveDate, timezone).start : null;
    const today = todayStart;

    if (!lastActiveDay || lastActiveDay.getTime() < today.getTime()) {
      // First full completion today
      const yesterday = getZonedDayBounds(new Date(todayStart.getTime() - 1), timezone).start;
      const wasActivePrev =
        lastActiveDay && lastActiveDay.getTime() === yesterday.getTime();

      returnedAfterBreak = Boolean(hunter.streakPausedAt);
      hunter.currentStreak = wasActivePrev ? hunter.currentStreak + 1 : 1;
      if (hunter.currentStreak > hunter.longestStreak) {
        hunter.longestStreak = hunter.currentStreak;
      }
      hunter.lastActiveDate = new Date();
      hunter.streakPausedAt = null;

      await hunter.save();

      if (returnedAfterBreak) {
        await recordGuildCelebration(userId, "milestone", "returned to their streak after a break", io);
      }

      // Streak milestone notifications
      const milestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];
      if (milestones.includes(hunter.currentStreak)) {
        await createNotification(
          userId,
          "streakMilestone",
          `🔥 STREAK MILESTONE — ${hunter.currentStreak} DAYS`,
          `You've completed all daily quests for ${hunter.currentStreak} days straight. The System is impressed.`,
          { streak: hunter.currentStreak },
          io,
        );
        await recordGuildCelebration(userId, "milestone", `reached a ${hunter.currentStreak}-day streak`, io);
      }
    }
  }

  return { hunter, returnedAfterBreak };
};

/**
 * Called by CRON at midnight.
 * Checks whether yesterday's daily quests were completed. Missing a day pauses
 * the current streak but never removes XP or guild progress.
 */
export const checkAndUpdateStreaks = async (userId, io = null) => {
  const [hunter, user] = await Promise.all([Hunter.findOne({ userId }), User.findById(userId).select("timezone").lean()]);
  if (!hunter) return;

  const timezone = normalizeTimeZone(user?.timezone);
  const { start: todayStart } = getZonedDayBounds(new Date(), timezone);
  const { start: yesterdayStart, end: yesterdayEnd } = getZonedDayBounds(new Date(todayStart.getTime() - 1), timezone);

  // Was the user even assigned quests yesterday?
  const [totalYesterday, completedYesterday] = await Promise.all([
    Quest.countDocuments({
      userId,
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
    }),
    Quest.countDocuments({
      userId,
      status: "completed",
      completedAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
    }),
  ]);

  if (totalYesterday === 0) return; // no quests assigned yesterday — no penalty

  const allDone = completedYesterday >= totalYesterday;
  const lastActiveDay = hunter.lastActiveDate ? getZonedDayBounds(hunter.lastActiveDate, timezone).start : null;
  const completedAllYesterday =
    lastActiveDay && lastActiveDay.getTime() === yesterdayStart.getTime();

  if (!allDone && !completedAllYesterday && hunter.currentStreak > 0) {
    const lostStreak = hunter.currentStreak;
    hunter.currentStreak = 0;
    hunter.streakPausedAt = new Date();
    await hunter.save();

    await createNotification(
      userId,
      "systemWarning",
      "STREAK ON PAUSE",
      `Your ${lostStreak}-day streak took a pause. Nothing was taken. Start again whenever you're ready.`,
      { lostStreak, xpPenalty: 0 },
      io,
    );

    if (io) {
      await emitToUser(io, userId, "system:streak-broken", {
        lostStreak,
        xpPenalty: 0,
      }, "progression");
    }
  }
};

/**
 * Legacy — kept for backward compat with cron imports.
 */
export const checkStreaks = checkAndUpdateStreaks;
export const updateStreak = updateStreakOnQuestComplete;

export const getHunterProfile = async (userId) => {
  const [hunter, stats, totalHunters] = await Promise.all([
    Hunter.findOne({ userId }).populate("guildId", "name tag"),
    Stats.findOne({ userId }),
    Hunter.countDocuments(),
  ]);

  if (!hunter) throw new AppError("Hunter not found.", 404);

  // Calculate Percentile (e.g., "Top 10%")
  const higherRanked = await Hunter.countDocuments({
    totalXP: { $gt: hunter.totalXP },
  });
  const percentile =
    totalHunters > 0
      ? Math.max(1, Math.round((higherRanked / totalHunters) * 100))
      : 100;

  return {
    hunter: { ...hunter.toObject(), percentile },
    stats,
  };
};

export const equipTitle = async (userId, title) => {
  const hunter = await Hunter.findOne({ userId });
  if (!hunter) throw new AppError("Hunter not found.", 404);
  if (!hunter.titles.includes(title))
    throw new AppError("Title not unlocked.", 400);
  hunter.title = title;
  await hunter.save();
  return hunter;
};
