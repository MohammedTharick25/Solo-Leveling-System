import Leaderboard from "./leaderboard.model.js";
import Hunter from "../hunter/hunter.model.js";
import User from "../user/user.model.js";
import Guild from "../guild/guild.model.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";

// ── Service ──────────────────────────────────────────────────────────────────

export const rebuildLeaderboard = async (
  type = "global",
  period = "weekly",
) => {
  const hunters = await Hunter.find({}).sort({ totalXP: -1 }).limit(200);
  const userIds = hunters.map((h) => h.userId);
  const users = await User.find({ _id: { $in: userIds } }).select("country");
  const userCountryMap = Object.fromEntries(
    users.map((u) => [u._id.toString(), u.country]),
  );

  const entries = hunters.map((h, idx) => ({
    userId: h.userId,
    hunterName: h.hunterName,
    rank: h.rank,
    level: h.level,
    totalXP: h.totalXP,
    weeklyXP: 0,
    powerScore: h.powerScore,
    currentStreak: h.currentStreak,
    position: idx + 1,
    change: 0,
    country: userCountryMap[h.userId?.toString()] || "Unknown",
  }));

  await Leaderboard.findOneAndUpdate(
    { type, period, guildId: null, country: null },
    { type, period, entries, generatedAt: new Date() },
    { upsert: true, new: true },
  );
};

export const getGlobalLeaderboard = async (
  period = "weekly",
  page = 1,
  limit = 50,
) => {
  const board = await Leaderboard.findOne({ type: "global", period });
  if (!board) return { entries: [], total: 0 };

  const start = (page - 1) * limit;
  const sliced = board.entries.slice(start, start + limit);
  return {
    entries: sliced,
    total: board.entries.length,
    generatedAt: board.generatedAt,
  };
};

export const getGuildLeaderboard = async (guildId) => {
  const guild = await Guild.findById(guildId)
    .populate("members.userId", "hunterName level rank")
    .select("members name");
  if (!guild) return { entries: [] };

  const entries = guild.members
    .map((m, i) => ({
      userId: m.userId?._id,
      hunterName: m.userId?.hunterName,
      level: m.userId?.level,
      rank: m.userId?.rank,
      contribution: m.contribution,
      role: m.role,
      position: i + 1,
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .map((e, i) => ({ ...e, position: i + 1 }));

  return { entries, guildName: guild.name };
};

export const getUserPosition = async (userId) => {
  const board = await Leaderboard.findOne({ type: "global", period: "weekly" });
  if (!board) return null;

  const entry = board.entries.find(
    (e) => e.userId?.toString() === userId.toString(),
  );
  return entry || null;
};

// ── Routes ───────────────────────────────────────────────────────────────────

const router = Router();
router.use(protect);

router.get(
  "/global",
  asyncHandler(async (req, res) => {
    const { period = "weekly", page, limit } = req.query;
    const data = await getGlobalLeaderboard(period, page, limit);
    const myPosition = await getUserPosition(req.userId);
    sendSuccess(res, { ...data, myPosition }, "Global leaderboard retrieved.");
  }),
);

router.get(
  "/guild/:guildId",
  asyncHandler(async (req, res) => {
    const data = await getGuildLeaderboard(req.params.guildId);
    sendSuccess(res, data, "Guild leaderboard retrieved.");
  }),
);

router.post(
  "/rebuild",
  asyncHandler(async (req, res) => {
    await rebuildLeaderboard("global", "weekly");
    sendSuccess(res, {}, "Leaderboard rebuilt.");
  }),
);

export default router;
