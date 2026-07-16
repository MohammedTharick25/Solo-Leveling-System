import Analytics from "./analytics.model.js";
import FocusSession from "../focusSession/focusSession.model.js";
import Quest from "../quest/quest.model.js";
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

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Save or update today's analytics snapshot. Called after significant events.
 */
export const recordDailySnapshot = async (userId) => {
  const today = startOfDay();
  const todayEnd = endOfDay();

  const [focusSessions, quests, journal, raids, notes, hunter, stats] =
    await Promise.all([
      FocusSession.find({ userId, startedAt: { $gte: today, $lte: todayEnd } }),
      Quest.find({ userId, updatedAt: { $gte: today, $lte: todayEnd } }),
      Journal.findOne({ userId, date: { $gte: today, $lte: todayEnd } }),
      TaskRaid.find({ userId, updatedAt: { $gte: today, $lte: todayEnd } }),
      KnowledgeNote.countDocuments({
        userId,
        createdAt: { $gte: today, $lte: todayEnd },
      }),
      Hunter.findOne({ userId }),
      Stats.findOne({ userId }),
    ]);

  const focusMinutes = focusSessions.reduce(
    (a, s) => a + (s.actualDuration || 0),
    0,
  );
  const studyMinutes = focusSessions
    .filter((s) => s.type === "study")
    .reduce((a, s) => a + (s.actualDuration || 0), 0);
  const xpEarned = focusSessions.reduce((a, s) => a + (s.xpEarned || 0), 0);

  const statsSnapshot = stats
    ? Object.fromEntries(
        [
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
        ].map((k) => [k, stats[k]?.value || 0]),
      )
    : {};

  const productivityScore = Math.min(
    100,
    Math.floor(
      quests.filter((q) => q.status === "completed").length * 10 +
        (Math.min(focusMinutes, 120) / 120) * 30 +
        raids.filter((r) => r.status === "completed").length * 8 +
        (journal ? 15 : 0),
    ),
  );

  const data = {
    xpEarned,
    questsCompleted: quests.filter((q) => q.status === "completed").length,
    questsFailed: quests.filter((q) => q.status === "failed").length,
    focusMinutes,
    focusSessionsCount: focusSessions.length,
    studyMinutes,
    raidsCompleted: raids.filter((r) => r.status === "completed").length,
    moodScore: journal?.mood || 0,
    energyScore: journal?.energyLevel || 0,
    streakDay: hunter?.currentStreak || 0,
    journalWritten: !!journal,
    notesCreated: notes,
    statsSnapshot,
    productivityScore,
  };

  return Analytics.findOneAndUpdate(
    { userId, date: { $gte: today, $lte: todayEnd } },
    { userId, date: today, ...data },
    { upsert: true, new: true },
  );
};

export const getDashboard = async (userId) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [snapshots, hunter, stats] = await Promise.all([
    Analytics.find({ userId, date: { $gte: thirtyDaysAgo } }).sort({ date: 1 }),
    Hunter.findOne({ userId }),
    Stats.findOne({ userId }),
  ]);

  return { snapshots, hunter, stats };
};

export const getHeatmap = async (userId, year) => {
  const start = new Date(`${year}-01-01T00:00:00Z`);
  const end = new Date(`${year}-12-31T23:59:59Z`);

  const snapshots = await Analytics.find({
    userId,
    date: { $gte: start, $lte: end },
  }).select(
    "date productivityScore questsCompleted focusMinutes xpEarned streakDay",
  );

  return snapshots.map((s) => ({
    date: s.date.toISOString().split("T")[0],
    score: s.productivityScore,
    quests: s.questsCompleted,
    focus: s.focusMinutes,
    xp: s.xpEarned,
    streak: s.streakDay,
  }));
};

export const getTrends = async (userId) => {
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
      totalQuests: thisWeek.reduce((a, s) => a + s.questsCompleted, 0),
      avgMood: Math.floor(avg(thisWeek, "moodScore") * 10) / 10,
    },
    lastWeek: {
      avgProductivity: Math.floor(avg(lastWeek, "productivityScore")),
      avgFocus: Math.floor(avg(lastWeek, "focusMinutes")),
      totalXP: lastWeek.reduce((a, s) => a + s.xpEarned, 0),
      totalQuests: lastWeek.reduce((a, s) => a + s.questsCompleted, 0),
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
router.use(protect, requireAwakened);

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
