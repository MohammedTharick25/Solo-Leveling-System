import Journal from "./journal.model.js";
import { awardXP, updateStreak } from "../hunter/hunter.service.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import {
  sendSuccess,
  asyncHandler,
  startOfDay,
  endOfDay,
} from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";

// ── AI Pattern Analysis (lightweight, no external API) ────────────────────────

const analyzeJournalPatterns = (entries) => {
  if (!entries.length) return null;

  const moods = entries.map((e) => e.mood || 5);
  const avgMood = moods.reduce((a, b) => a + b, 0) / moods.length;

  const allFailures = entries.flatMap((e) => e.failures || []);
  const allLessons = entries.flatMap((e) => e.lessons || []);

  const patterns = [];
  const suggestions = [];
  const weaknessesDetected = [];

  if (avgMood < 5) {
    patterns.push("Mood trend is below average this week.");
    suggestions.push(
      "Prioritize recovery: sleep, exercise, and social connection.",
    );
    weaknessesDetected.push("emotionalControl");
  }
  if (avgMood >= 7) {
    patterns.push(
      "Strong positive mood trend. High-performance window detected.",
    );
    suggestions.push(
      "Use this energy surge to tackle your hardest challenges.",
    );
  }
  if (allFailures.length > allLessons.length * 2) {
    patterns.push(
      "More failures logged than lessons extracted. Growth potential untapped.",
    );
    suggestions.push(
      "For each failure, write at least one concrete lesson to extract maximum value.",
    );
    weaknessesDetected.push("problemSolving");
  }

  const moodVariance =
    moods.reduce((acc, m) => acc + Math.pow(m - avgMood, 2), 0) / moods.length;
  if (moodVariance > 4) {
    patterns.push("High mood volatility detected across the week.");
    suggestions.push(
      "Establish a consistent sleep and routine schedule to stabilize energy levels.",
    );
    weaknessesDetected.push("emotionalControl");
  }

  return {
    patterns,
    suggestions,
    weaknessesDetected: [...new Set(weaknessesDetected)],
    strengthsDetected: avgMood >= 7 ? ["emotionalControl"] : [],
  };
};

// ── Service ──────────────────────────────────────────────────────────────────

export const createOrUpdateEntry = async (userId, data, io = null) => {
  const date = data.date ? startOfDay(new Date(data.date)) : startOfDay();

  const wordCount = [
    ...(data.wins || []),
    ...(data.failures || []),
    ...(data.lessons || []),
    data.freeText || "",
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  const existing = await Journal.findOne({
    userId,
    date: { $gte: date, $lte: endOfDay(date) },
  });

  let entry;
  if (existing) {
    Object.assign(existing, { ...data, wordCount });
    entry = await existing.save();
  } else {
    entry = await Journal.create({ userId, date, ...data, wordCount });
    // First journal of the day → award XP
    await Promise.all([awardXP(userId, 10, io), updateStreak(userId, io)]);
  }

  return entry;
};

export const getEntry = async (userId, dateStr) => {
  const date = dateStr ? startOfDay(new Date(dateStr)) : startOfDay();
  return Journal.findOne({
    userId,
    date: { $gte: date, $lte: endOfDay(date) },
  });
};

export const getEntries = async (userId, page = 1, limit = 30) => {
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    Journal.find({ userId }).sort({ date: -1 }).skip(skip).limit(limit),
    Journal.countDocuments({ userId }),
  ]);
  return { entries, total, page, pages: Math.ceil(total / limit) };
};

export const getInsights = async (userId) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const recentEntries = await Journal.find({
    userId,
    date: { $gte: sevenDaysAgo },
  }).sort({ date: -1 });

  const insights = analyzeJournalPatterns(recentEntries);
  return { insights, entryCount: recentEntries.length };
};

// ── Routes ───────────────────────────────────────────────────────────────────

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.query.date) {
      const entry = await getEntry(req.userId, req.query.date);
      return sendSuccess(res, { entry }, "Journal entry retrieved.");
    }
    const result = await getEntries(
      req.userId,
      req.query.page,
      req.query.limit,
    );
    sendSuccess(res, result, "Journal entries retrieved.");
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const entry = await createOrUpdateEntry(req.userId, req.body, io);
    sendSuccess(res, { entry }, "Journal entry saved.", 201);
  }),
);

router.get(
  "/insights",
  asyncHandler(async (req, res) => {
    const result = await getInsights(req.userId);
    sendSuccess(res, result, "Insights generated.");
  }),
);

export default router;
