import HunterReport from "./hunterReport.mode.js";
import Hunter from "../hunter/hunter.model.js";
import Stats from "../stats/stats.model.js";
import Quest from "../quest/quest.model.js";
import Analytics from "../analytics/analytics.model.js";
import Journal from "../journal/journal.model.js";
import Boss from "../boss/boss.model.js";
import Shadow from "../shadow/shadow.model.js";
import { createNotification } from "../notification/notification.service.js";
import { sendSuccess, asyncHandler, startOfWeek } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

// ── Service ──────────────────────────────────────────────────────────────────

const STAT_NAMES = [
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

const RECOMMENDATIONS = {
  discipline: [
    "Set a fixed wake-up time and protect it for the next 7 days.",
    "Use time-blocking to schedule your 3 most important tasks each morning.",
    "Commit to a no-phone first hour each day this week.",
  ],
  focus: [
    "Start each work block with a 2-minute intention-setting ritual.",
    "Use the Pomodoro technique for all deep work this week.",
    "Identify your peak focus hours and protect them fiercely.",
  ],
  health: [
    "Aim for 7-8 hours of sleep every night this week.",
    "Take a 10-minute walk after each meal.",
    "Drink 2L of water daily — track it.",
  ],
  learning: [
    "Read for at least 20 minutes before bed every night.",
    "Pick one skill and dedicate 30 minutes to it each day.",
    "Write down one thing you learned each day in your journal.",
  ],
  communication: [
    "Initiate one meaningful conversation per day.",
    "Practice active listening — no interrupting for the entire week.",
    "Write one clear, concise message per day with a specific call to action.",
  ],
  default: [
    "Review your weekly goals every morning.",
    "End each day with a 5-minute reflection.",
    "Celebrate small wins — they compound into major victories.",
  ],
};

const getRecommendations = (weakestStat) => {
  const category = weakestStat?.includes("Discipline")
    ? "discipline"
    : weakestStat?.includes("Focus") || weakestStat?.includes("Sense")
      ? "focus"
      : weakestStat?.includes("Health") || weakestStat?.includes("Vitality")
        ? "health"
        : weakestStat?.includes("Intelligence")
          ? "learning"
          : weakestStat?.includes("Communication")
            ? "communication"
            : "default";

  return RECOMMENDATIONS[category] || RECOMMENDATIONS.default;
};

export const generateWeeklyReport = async (userId, io = null) => {
  const weekStart = startOfWeek();
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 3600 * 1000);

  // Don't regenerate if already exists for this week
  const existing = await HunterReport.findOne({ userId, weekStart });
  if (existing) return existing;

  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 3600 * 1000);

  const [
    hunter,
    stats,
    weekAnalytics,
    quests,
    journals,
    bossesDefeated,
    shadowsEvolved,
  ] = await Promise.all([
    Hunter.findOne({ userId }),
    Stats.findOne({ userId }),
    Analytics.find({ userId, date: { $gte: lastWeekStart, $lt: weekStart } }),
    Quest.find({ userId, updatedAt: { $gte: lastWeekStart, $lt: weekStart } }),
    Journal.find({ userId, date: { $gte: lastWeekStart, $lt: weekStart } }),
    Boss.countDocuments({
      userId,
      status: "defeated",
      defeatedAt: { $gte: lastWeekStart },
    }),
    Shadow.countDocuments({ userId, updatedAt: { $gte: lastWeekStart } }),
  ]);

  // Stat deltas — find most improved and weakest
  const statDeltas = STAT_NAMES.map((name) => {
    const hist = stats?.[name]?.history || [];
    const recent = hist.filter((h) => new Date(h.date) >= lastWeekStart);
    if (recent.length < 2)
      return { name, delta: 0, current: stats?.[name]?.value || 0 };
    const delta = recent[recent.length - 1].value - recent[0].value;
    return { name, delta, current: stats?.[name]?.value || 0 };
  });

  const mostImproved = [...statDeltas].sort((a, b) => b.delta - a.delta)[0];
  const weakest = [...statDeltas].sort((a, b) => a.current - b.current)[0];

  // Quest completion rate
  const completed = quests.filter((q) => q.status === "completed").length;
  const assigned = quests.length;
  const completionRate = assigned > 0 ? completed / assigned : 0;

  // Productivity trend
  const avgScore = weekAnalytics.length
    ? weekAnalytics.reduce((a, s) => a + s.productivityScore, 0) /
      weekAnalytics.length
    : 0;
  const prevWeekAnalytics = await Analytics.find({
    userId,
    date: {
      $gte: new Date(lastWeekStart.getTime() - 7 * 24 * 3600 * 1000),
      $lt: lastWeekStart,
    },
  });
  const prevAvgScore = prevWeekAnalytics.length
    ? prevWeekAnalytics.reduce((a, s) => a + s.productivityScore, 0) /
      prevWeekAnalytics.length
    : 0;
  const productivityTrend =
    avgScore > prevAvgScore + 5
      ? "rising"
      : avgScore < prevAvgScore - 5
        ? "declining"
        : "stable";

  const avgMood = journals.length
    ? journals.reduce((a, j) => a + (j.mood || 5), 0) / journals.length
    : 0;

  const totalXP = weekAnalytics.reduce((a, s) => a + s.xpEarned, 0);
  const totalFocus = weekAnalytics.reduce((a, s) => a + s.focusMinutes, 0);

  const statsSnapshot = Object.fromEntries(
    STAT_NAMES.map((n) => [n, stats?.[n]?.value || 0]),
  );

  const report = await HunterReport.create({
    userId,
    weekStart,
    weekEnd,
    mostImprovedStat: mostImproved?.name || "N/A",
    mostImprovedStatDelta: mostImproved?.delta || 0,
    weakestStat: weakest?.name || "N/A",
    weakestStatValue: weakest?.current || 0,
    productivityTrend,
    streakPerformance: hunter?.currentStreak || 0,
    questCompletionRate: completionRate,
    totalQuestsAssigned: assigned,
    totalQuestsCompleted: completed,
    totalXPEarned: totalXP,
    totalFocusMinutes: totalFocus,
    suggestedFocusArea: weakest?.name || "discipline",
    personalizedRecommendations: getRecommendations(weakest?.name),
    topAchievements: [],
    statsSnapshot,
    averageMood: Math.round(avgMood * 10) / 10,
    bossesDefeated,
    shadowsEvolved,
    level: hunter?.level,
    rank: hunter?.rank,
  });

  await createNotification(
    userId,
    "weeklyReport",
    "WEEKLY HUNTER REPORT",
    `Your weekly performance report is ready. Trend: ${productivityTrend.toUpperCase()}. Quest completion: ${Math.round(completionRate * 100)}%.`,
    { reportId: report._id },
    io,
  );

  return report;
};

export const getWeeklyReport = async (userId) => {
  const weekStart = startOfWeek();
  const report = await HunterReport.findOne({ userId, weekStart });
  if (!report)
    throw new AppError(
      "No report for this week yet. Check back after Sunday.",
      404,
    );
  return report;
};

export const getReportHistory = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [reports, total] = await Promise.all([
    HunterReport.find({ userId })
      .sort({ weekStart: -1 })
      .skip(skip)
      .limit(limit),
    HunterReport.countDocuments({ userId }),
  ]);
  return { reports, total, page, pages: Math.ceil(total / limit) };
};

// ── Routes ───────────────────────────────────────────────────────────────────

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/weekly",
  asyncHandler(async (req, res) => {
    const report = await getWeeklyReport(req.userId);
    sendSuccess(res, { report }, "Weekly report retrieved.");
  }),
);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const result = await getReportHistory(
      req.userId,
      req.query.page,
      req.query.limit,
    );
    sendSuccess(res, result, "Report history retrieved.");
  }),
);

router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const report = await generateWeeklyReport(req.userId, io);
    sendSuccess(res, { report }, "Report generated.", 201);
  }),
);

export default router;
