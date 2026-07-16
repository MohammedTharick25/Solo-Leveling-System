import Stats from "./stats.model.js";
import FocusSession from "../focusSession/focusSession.model.js";
import Quest from "../quest/quest.model.js";
import Journal from "../journal/journal.model.js";
import Hunter from "../hunter/hunter.model.js";
import TaskRaid from "../taskRaid/taskRaid.model.js";
import { clamp, startOfDay } from "../../lib/helpers.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 3600 * 1000);
const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 3600 * 1000);

/**
 * Recomputes all productivity scores for a user based on real activity data.
 * Called by cron every 4 hours and on-demand.
 */
export const computeAndSaveStats = async (userId) => {
  const stats = await Stats.findOne({ userId });
  if (!stats) throw new AppError("Stats not found.", 404);

  const hunter = await Hunter.findOne({ userId });

  const [
    recentFocusSessions,
    recentQuests,
    completedQuests7d,
    assignedQuests7d,
    recentJournals,
    recentRaids,
  ] = await Promise.all([
    FocusSession.find({ userId, startedAt: { $gte: sevenDaysAgo() } }),
    Quest.find({ userId, updatedAt: { $gte: sevenDaysAgo() } }),
    Quest.countDocuments({
      userId,
      status: "completed",
      updatedAt: { $gte: sevenDaysAgo() },
    }),
    Quest.countDocuments({ userId, createdAt: { $gte: sevenDaysAgo() } }),
    Journal.find({ userId, date: { $gte: sevenDaysAgo() } }),
    TaskRaid.find({ userId, updatedAt: { $gte: sevenDaysAgo() } }),
  ]);

  // ── Focus Score ──────────────────────────────────────────────────────────
  const completedSessions = recentFocusSessions.filter((s) => s.completed);
  const totalFocusMinutes = recentFocusSessions.reduce(
    (a, s) => a + (s.actualDuration || 0),
    0,
  );
  const avgFocusScore = completedSessions.length
    ? completedSessions.reduce((a, s) => a + s.focusScore, 0) /
      completedSessions.length
    : 0;
  const focusScore = clamp(
    Math.floor(
      avgFocusScore * 0.6 + (Math.min(totalFocusMinutes, 700) / 700) * 40,
    ),
    0,
    100,
  );

  // ── Discipline Score ─────────────────────────────────────────────────────
  const questCompletionRate =
    assignedQuests7d > 0 ? completedQuests7d / assignedQuests7d : 0;
  const streakFactor = Math.min(hunter.currentStreak / 14, 1); // 14-day streak = 100%
  const disciplineScore = clamp(
    Math.floor(questCompletionRate * 60 + streakFactor * 40),
    0,
    100,
  );

  // ── Learning Score ───────────────────────────────────────────────────────
  const learningQuests = completedQuests7d;
  const learningMinutes = recentFocusSessions
    .filter((s) => s.type === "study" || s.type === "reading")
    .reduce((a, s) => a + (s.actualDuration || 0), 0);
  const learningScore = clamp(
    Math.floor(
      (Math.min(learningQuests, 10) / 10) * 50 +
        (Math.min(learningMinutes, 300) / 300) * 50,
    ),
    0,
    100,
  );

  // ── Health Score ─────────────────────────────────────────────────────────
  const healthQuests = recentQuests.filter(
    (q) => q.category === "health" && q.status === "completed",
  ).length;
  const avgMood = recentJournals.length
    ? recentJournals.reduce((a, j) => a + (j.mood || 5), 0) /
      recentJournals.length
    : 5;
  const healthScore = clamp(
    Math.floor(
      (healthQuests / Math.max(assignedQuests7d, 1)) * 50 + (avgMood / 10) * 50,
    ),
    0,
    100,
  );

  // ── Consistency Score ────────────────────────────────────────────────────
  const consistencyScore = clamp(
    Math.floor(streakFactor * 70 + questCompletionRate * 30),
    0,
    100,
  );

  // ── Momentum Score ───────────────────────────────────────────────────────
  const completedRaids = recentRaids.filter(
    (r) => r.status === "completed",
  ).length;
  const momentumScore = clamp(
    Math.floor(
      completedQuests7d * 5 + completedSessions.length * 3 + completedRaids * 4,
    ),
    0,
    100,
  );

  // ── Energy Score (based on mood + journal frequency) ────────────────────
  const journalConsistency = Math.min(recentJournals.length / 7, 1);
  const energyScore = clamp(
    Math.floor(avgMood * 8 + journalConsistency * 20),
    0,
    100,
  );

  // ── Performance Score (composite) ───────────────────────────────────────
  const performanceScore = clamp(
    Math.floor(
      focusScore * 0.25 +
        disciplineScore * 0.25 +
        consistencyScore * 0.2 +
        momentumScore * 0.15 +
        learningScore * 0.1 +
        healthScore * 0.05,
    ),
    0,
    100,
  );

  stats.focusScore = focusScore;
  stats.disciplineScore = disciplineScore;
  stats.learningScore = learningScore;
  stats.healthScore = healthScore;
  stats.consistencyScore = consistencyScore;
  stats.momentumScore = momentumScore;
  stats.energyScore = energyScore;
  stats.performanceScore = performanceScore;
  stats.lastComputedAt = new Date();

  await stats.save();
  return stats;
};

export const getStats = async (userId) => {
  const stats = await Stats.findOne({ userId });
  if (!stats) throw new AppError("Stats not found.", 404);
  return stats;
};

export const getStatHistory = async (userId, statName, days = 30) => {
  const stats = await Stats.findOne({ userId });
  if (!stats) throw new AppError("Stats not found.", 404);
  if (!stats[statName])
    throw new AppError(`Stat "${statName}" does not exist.`, 400);

  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const history = (stats[statName].history || []).filter(
    (h) => new Date(h.date) >= since,
  );

  return { stat: statName, currentValue: stats[statName].value, history };
};
