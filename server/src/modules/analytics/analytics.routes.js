import Analytics from "./analytics.model.js";
import FocusSession from "../focusSession/focusSession.model.js";
import Quest from "../quest/quest.model.js";
import Habit from "../habits/habit.model.js";
import Journal from "../journal/journal.model.js";
import Hunter from "../hunter/hunter.model.js";
import TaskRaid from "../taskRaid/taskRaid.model.js";
import KnowledgeNote from "../brain/knowledgeNote.model.js";
import Stats from "../stats/stats.model.js";
import {
  sendSuccess,
  asyncHandler,
  startOfDay,
  endOfDay,
} from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { projectFutureSelf } from "../../lib/xpFormulas.js";
import { requirePlan } from "../../middleware/requirePlan.middleware.js";

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Build today's snapshot from the activity records, including XP adjusted for streak bonuses.
 */
const snapshotJobs = new Map();

const buildDailySnapshot = async (userId, today) => {
  const todayEnd = endOfDay(today);
  const range = { $gte: today, $lte: todayEnd };

  const [
    focusSessions,
    completedQuests,
    questsFailed,
    habits,
    journal,
    raids,
    notes,
    hunter,
    stats,
  ] = await Promise.all([
    FocusSession.find({ userId, startedAt: range }),
    Quest.find({ userId, completedAt: range }).select("xpReward earnedXP").lean(),
    Quest.countDocuments({ userId, failedAt: range }),
    Habit.find({ userId, "completions.date": range }).select("xpReward completions").lean(),
    Journal.findOne({ userId, date: range }),
    TaskRaid.find({ userId, updatedAt: range }),
    KnowledgeNote.countDocuments({ userId, createdAt: range }),
    Hunter.findOne({ userId }),
    Stats.findOne({ userId }),
  ]);

  const focusMinutes = focusSessions.reduce(
    (total, session) => total + (session.actualDuration || 0),
    0,
  );
  const studyMinutes = focusSessions
    .filter((session) => session.type === "study")
    .reduce((total, session) => total + (session.actualDuration || 0), 0);
  const focusXpEarned = focusSessions.reduce(
    (total, session) => total + (session.xpEarned || 0),
    0,
  );
  const questXpEarned = completedQuests.reduce(
    (total, quest) =>
      total + (quest.earnedXP > 0 ? quest.earnedXP : Math.max(1, quest.xpReward || 0)),
    0,
  );

  const todayHabitCompletions = habits.flatMap((habit) =>
    (habit.completions || [])
      .filter((completion) => {
        const date = new Date(completion.date);
        return date >= today && date <= todayEnd;
      })
      .map((completion) => ({
        xpEarned: completion.earnedXP > 0
          ? completion.earnedXP
          : Math.max(1, habit.xpReward || 0),
      })),
  );
  const habitsCompleted = todayHabitCompletions.length;
  const habitXpEarned = todayHabitCompletions.reduce(
    (total, completion) => total + completion.xpEarned,
    0,
  );
  const questsCompleted = completedQuests.length;
  const xpEarned = questXpEarned + habitXpEarned + focusXpEarned;

  const statsSnapshot = stats
    ? Object.fromEntries(
        [
          "strength", "agility", "intelligence", "vitality", "sense",
          "discipline", "communication", "leadership", "creativity",
          "financialIntelligence", "problemSolving", "emotionalControl",
          "timeManagement",
        ].map((key) => [key, stats[key]?.value || 0]),
      )
    : {};

  const productivityScore = Math.min(
    100,
    Math.floor(
      questsCompleted * 10 +
        Math.min(habitsCompleted, 4) * 5 +
        (Math.min(focusMinutes, 120) / 120) * 30 +
        raids.filter((raid) => raid.status === "completed").length * 8 +
        (journal ? 15 : 0),
    ),
  );

  const data = {
    xpEarned,
    questXpEarned,
    habitXpEarned,
    focusXpEarned,
    questsCompleted,
    questsFailed,
    habitsCompleted,
    focusMinutes,
    focusSessionsCount: focusSessions.length,
    studyMinutes,
    raidsCompleted: raids.filter((raid) => raid.status === "completed").length,
    moodScore: journal?.mood || 0,
    energyScore: journal?.energyLevel || 0,
    streakDay: hunter?.currentStreak || 0,
    journalWritten: !!journal,
    notesCreated: notes,
    statsSnapshot,
    productivityScore,
  };

  return Analytics.findOneAndUpdate(
    { userId, date: range },
    { userId, date: today, ...data },
    { upsert: true, new: true },
  );
};

export const recordDailySnapshot = async (userId) => {
  const today = startOfDay();
  const key = `${userId}:${today.toISOString()}`;
  if (snapshotJobs.has(key)) return snapshotJobs.get(key);

  const job = buildDailySnapshot(userId, today);
  snapshotJobs.set(key, job);
  try {
    return await job;
  } finally {
    if (snapshotJobs.get(key) === job) snapshotJobs.delete(key);
  }
};

export const getDashboard = async (userId) => {
  await recordDailySnapshot(userId);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [snapshots, hunter, stats] = await Promise.all([
    Analytics.find({ userId, date: { $gte: thirtyDaysAgo } }).sort({ date: 1 }),
    Hunter.findOne({ userId }),
    Stats.findOne({ userId }),
  ]);

  return { snapshots, hunter, stats };
};

export const getHeatmap = async (userId, year) => {
  if (Number(year) === new Date().getFullYear()) await recordDailySnapshot(userId);
  const start = new Date(`${year}-01-01T00:00:00Z`);
  const end = new Date(`${year}-12-31T23:59:59Z`);

  const snapshots = await Analytics.find({
    userId,
    date: { $gte: start, $lte: end },
  }).select(
    "date productivityScore questsCompleted habitsCompleted focusMinutes xpEarned streakDay",
  );

  return snapshots.map((s) => ({
    date: s.date.toISOString().split("T")[0],
    score: s.productivityScore,
    quests: s.questsCompleted,
    habits: s.habitsCompleted || 0,
    focus: s.focusMinutes,
    xp: s.xpEarned,
    streak: s.streakDay,
  }));
};

export const getTrends = async (userId) => {
  await recordDailySnapshot(userId);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000);

  const [thisWeek, lastWeek] = await Promise.all([
    Analytics.find({ userId, date: { $gte: sevenDaysAgo } }),
    Analytics.find({
      userId,
      date: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    }),
  ]);

  const avg = (arr, key) =>
    arr.length ? arr.reduce((a, b) => a + (b[key] || 0), 0) / arr.length : 0;

  return {
    thisWeek: {
      avgProductivity: Math.floor(avg(thisWeek, "productivityScore")),
      avgFocus: Math.floor(avg(thisWeek, "focusMinutes")),
      totalXP: thisWeek.reduce((a, s) => a + s.xpEarned, 0),
      questXP: thisWeek.reduce((total, snapshot) => total + (snapshot.questXpEarned || 0), 0),
      habitXP: thisWeek.reduce((total, snapshot) => total + (snapshot.habitXpEarned || 0), 0),
      focusXP: thisWeek.reduce((total, snapshot) => total + (snapshot.focusXpEarned || 0), 0),
      totalQuests: thisWeek.reduce((a, s) => a + s.questsCompleted, 0),
      totalHabits: thisWeek.reduce((total, snapshot) => total + (snapshot.habitsCompleted || 0), 0),
      avgMood: Math.floor(avg(thisWeek, "moodScore") * 10) / 10,
    },
    lastWeek: {
      avgProductivity: Math.floor(avg(lastWeek, "productivityScore")),
      avgFocus: Math.floor(avg(lastWeek, "focusMinutes")),
      totalXP: lastWeek.reduce((a, s) => a + s.xpEarned, 0),
      questXP: lastWeek.reduce((total, snapshot) => total + (snapshot.questXpEarned || 0), 0),
      habitXP: lastWeek.reduce((total, snapshot) => total + (snapshot.habitXpEarned || 0), 0),
      focusXP: lastWeek.reduce((total, snapshot) => total + (snapshot.focusXpEarned || 0), 0),
      totalQuests: lastWeek.reduce((a, s) => a + s.questsCompleted, 0),
      totalHabits: lastWeek.reduce((total, snapshot) => total + (snapshot.habitsCompleted || 0), 0),
      avgMood: Math.floor(avg(lastWeek, "moodScore") * 10) / 10,
    },
  };
};

export const getPredictions = async (userId) => {
  const hunter = await Hunter.findOne({ userId });
  return [30, 60, 90, 180, 365].map((days) =>
    projectFutureSelf(hunter, null, days),
  );
};

// ── Routes ───────────────────────────────────────────────────────────────────

const router = Router();
router.use(protect, requireAwakened, requirePlan("hunter"));

router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const data = await getDashboard(req.userId);
    sendSuccess(res, data, "Dashboard analytics retrieved.");
  }),
);

router.get(
  "/heatmap",
  asyncHandler(async (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    const data = await getHeatmap(req.userId, year);
    sendSuccess(res, { heatmap: data }, "Heatmap data retrieved.");
  }),
);

router.get(
  "/trends",
  asyncHandler(async (req, res) => {
    const data = await getTrends(req.userId);
    sendSuccess(res, { trends: data }, "Trends retrieved.");
  }),
);

router.get(
  "/predictions",
  asyncHandler(async (req, res) => {
    const data = await getPredictions(req.userId);
    sendSuccess(res, { predictions: data }, "Predictions calculated.");
  }),
);

export default router;
