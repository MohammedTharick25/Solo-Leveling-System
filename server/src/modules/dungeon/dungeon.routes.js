import Dungeon from "./dungeon.model.js";
import { awardXP, updateStreak } from "../hunter/hunter.service.js";
import { createNotification } from "../notification/notification.service.js";
import { emitToUser } from "../../infrastructure/socket/socketManager.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";
import { requirePlan } from "../../middleware/requirePlan.middleware.js";
import User from "../user/user.model.js";
import Hunter from "../hunter/hunter.model.js";
import Stats from "../stats/stats.model.js";
import Goal from "../goals/goal.model.js";
import Habit from "../habits/habit.model.js";
import FocusSession from "../focusSession/focusSession.model.js";
import { generateJSON, isCloudAIConfigured } from "../../lib/ai/ai.service.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const RANKS = ["F", "E", "D", "C", "B", "A", "S"];
const rankIndexForHunter = (rank, level) => {
  const rankIndex = { Unawakened: 0, E: 1, D: 2, C: 3, B: 4, A: 5, S: 6, National: 6, Monarch: 6, "Shadow Monarch": 6 }[rank] ?? 0;
  return clamp(Math.max(rankIndex, Math.floor(Math.max(1, level) / 10)), 0, RANKS.length - 1);
};

const getDungeonProfile = async (userId) => {
  const [user, hunter, stats, goals, habits, focusSessions] = await Promise.all([
    User.findById(userId).select("awakening hunterName").lean(),
    Hunter.findOne({ userId }).select("level rank totalXP currentStreak totalFocusMinutes totalQuestCompletions").lean(),
    Stats.findOne({ userId }).lean(),
    Goal.find({ userId, status: "active" }).select("title category progress").limit(5).lean(),
    Habit.find({ userId, isActive: true }).select("name category currentStreak").limit(8).lean(),
    FocusSession.find({ userId, completed: true }).sort({ endedAt: -1 }).limit(20).select("type actualDuration").lean(),
  ]);
  if (!hunter) throw new AppError("Hunter profile not found.", 404);

  const statNames = ["strength", "agility", "intelligence", "vitality", "sense", "discipline", "communication", "leadership", "creativity", "financialIntelligence", "problemSolving", "emotionalControl", "timeManagement"];
  const statValues = Object.fromEntries(statNames.map((name) => [name, stats?.[name]?.value ?? 10]));
  const strongestStats = [...statNames].sort((a, b) => statValues[b] - statValues[a]).slice(0, 3);
  const growthStats = [...statNames].sort((a, b) => statValues[a] - statValues[b]).slice(0, 3);
  const recentFocusMinutes = focusSessions.reduce((total, session) => total + (session.actualDuration || 0), 0);

  return {
    hunterName: user?.hunterName || hunter.hunterName,
    level: hunter.level,
    rank: hunter.rank,
    totalXP: hunter.totalXP,
    currentStreak: hunter.currentStreak,
    totalFocusMinutes: hunter.totalFocusMinutes,
    totalQuestCompletions: hunter.totalQuestCompletions,
    recentFocusSessions: focusSessions.length,
    recentFocusMinutes,
    strongestStats: strongestStats.map((name) => ({ name, value: statValues[name] })),
    growthStats: growthStats.map((name) => ({ name, value: statValues[name] })),
    activeGoals: goals,
    currentHabits: habits,
    awakening: {
      occupation: user?.awakening?.occupation,
      isStudent: user?.awakening?.isStudent,
      learningInterests: user?.awakening?.learningInterests || [],
      availableDailyMinutes: user?.awakening?.availableDailyMinutes || 60,
      fitnessLevel: user?.awakening?.fitnessLevel,
      longTermVision: user?.awakening?.longTermVision,
    },
  };
};

const cleanGeneratedDungeon = (raw, type, profile) => {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim().slice(0, 100);
  const description = String(raw.description || "").trim().slice(0, 500);
  const challenges = Array.isArray(raw.challenges) ? raw.challenges : [];
  if (!name || !description || challenges.length < 3 || challenges.length > 5) return null;
  const cleanedChallenges = challenges.map((challenge, order) => ({
    title: String(challenge.title || "").trim().slice(0, 140),
    description: String(challenge.description || "").trim().slice(0, 300),
    xpReward: clamp(Math.round(Number(challenge.xpReward) || 50), 10, 250),
    order,
    completed: false,
  }));
  if (cleanedChallenges.some((challenge) => !challenge.title)) return null;
  const difficultyIndex = rankIndexForHunter(profile.rank, profile.level);
  const requestedDifficulty = Number(raw.difficultyIndex);
  const completionBonus = clamp(Math.round(Number(raw.completionBonus) || 150), 50, 600);
  return {
    type,
    name,
    description,
    difficulty: RANKS[clamp(Number.isFinite(requestedDifficulty) ? requestedDifficulty : difficultyIndex, 0, difficultyIndex)],
    challenges: cleanedChallenges,
    completionBonus,
  };
};

const buildAdaptiveDungeon = (type, template, profile) => {
  const rewardScale = clamp(0.8 + profile.level / 35 + profile.recentFocusSessions / 100, 0.8, 1.8);
  const difficultyIndex = rankIndexForHunter(profile.rank, profile.level);
  return {
    type,
    name: template.name,
    description: `${template.description} Adapted for Level ${profile.level} ${profile.rank} Hunter progression.`,
    difficulty: RANKS[difficultyIndex],
    challenges: template.challenges.map((challenge, order) => ({
      ...challenge,
      xpReward: clamp(Math.round(challenge.xpReward * rewardScale), 10, 250),
      order,
      completed: false,
    })),
    completionBonus: clamp(Math.round(template.completionBonus * rewardScale), 50, 600),
  };
};

const generatePersonalDungeon = async (userId, type) => {
  const template = DUNGEON_TEMPLATES[type];
  const profile = await getDungeonProfile(userId);
  if (isCloudAIConfigured()) {
    try {
      const result = await generateJSON({
        prompt: `Create a practical, personalized productivity dungeon for the selected category "${type}". Return JSON only with this exact shape: {"name":"...","description":"...","difficultyIndex":0,"completionBonus":150,"challenges":[{"title":"...","description":"...","xpReward":60}]}. Create 3-5 concrete, achievable steps that connect to the user's real goals, interests, habits, and weak stats. Scale difficulty to their rank and level. Each task should be finishable and verifiable by the user; avoid unsafe health advice, arbitrary punishment, vague tasks, and more than ${profile.awakening.availableDailyMinutes} minutes of planned work in one day. XP must be a number from 10 to 250 and completionBonus from 50 to 600. Difficulty index is 0-6 for F,E,D,C,B,A,S and cannot exceed ${rankIndexForHunter(profile.rank, profile.level)}. PROFILE: ${JSON.stringify(profile)}`,
      });
      const generated = cleanGeneratedDungeon(result, type, profile);
      if (generated) return { ...generated, generationSource: "ai", profile };
    } catch (error) {
      console.warn(`[DUNGEON] AI generation failed; using adaptive fallback: ${error.message}`);
    }
  }
  return { ...buildAdaptiveDungeon(type, template, profile), generationSource: "adaptive", profile };
};

// ── Dungeon Templates ─────────────────────────────────────────────────────────

const DUNGEON_TEMPLATES = {
  study: {
    name: "The Library of Forgotten Knowledge",
    description:
      "A vast dungeon of ancient texts. Only those who can focus will extract its wisdom.",
    challenges: [
      { title: "Complete a 25-minute study session", xpReward: 80 },
      { title: "Summarize what you learned in 5 bullet points", xpReward: 60 },
      {
        title: "Complete a second 25-minute session on the same topic",
        xpReward: 100,
      },
      { title: "Create a knowledge note with your findings", xpReward: 80 },
      { title: "Teach the concept back in your own words", xpReward: 130 },
    ],
    difficulty: "C",
    completionBonus: 200,
  },
  reading: {
    name: "The Infinite Archive",
    description:
      "Endless corridors of books. Each chapter clears a path deeper into the dungeon.",
    challenges: [
      { title: "Read for 20 minutes without stopping", xpReward: 70 },
      { title: "Note 3 key ideas from your reading", xpReward: 60 },
      { title: "Read for another 30 minutes", xpReward: 100 },
      { title: "Write a 100-word summary", xpReward: 90 },
    ],
    difficulty: "D",
    completionBonus: 150,
  },
  coding: {
    name: "The Algorithm Labyrinth",
    description:
      "A dungeon that tests logic, patience and the ability to think in systems.",
    challenges: [
      { title: "Code for 30 minutes on a single problem", xpReward: 100 },
      {
        title: "Solve or make meaningful progress on a challenge",
        xpReward: 120,
      },
      { title: "Document your solution or progress", xpReward: 80 },
      { title: "Review and refactor your code", xpReward: 100 },
    ],
    difficulty: "B",
    completionBonus: 300,
  },
  fitness: {
    name: "The Iron Fortress",
    description: "A physical gauntlet that forges the body into a weapon.",
    challenges: [
      { title: "Complete a 10-minute warm-up", xpReward: 50 },
      { title: "Finish your main workout", xpReward: 150 },
      { title: "Do 5 minutes of stretching", xpReward: 50 },
      { title: "Log your workout details", xpReward: 50 },
    ],
    difficulty: "C",
    completionBonus: 200,
  },
  deepWork: {
    name: "The Sanctum of Silence",
    description:
      "A place where only the most disciplined minds can operate at full capacity.",
    challenges: [
      { title: "Eliminate all distractions for 90 minutes", xpReward: 200 },
      { title: "Produce a meaningful output from your session", xpReward: 150 },
      { title: "Reflect on what you achieved", xpReward: 100 },
    ],
    difficulty: "A",
    completionBonus: 400,
  },
  discipline: {
    name: "The Trial of Will",
    description:
      "A dungeon that tests your ability to do what you said you would do.",
    challenges: [
      { title: "Complete your planned morning routine", xpReward: 100 },
      { title: "Finish 3 scheduled tasks on time", xpReward: 150 },
      { title: "Avoid all planned distractions for the day", xpReward: 200 },
      { title: "Review and complete your daily checklist", xpReward: 100 },
    ],
    difficulty: "B",
    completionBonus: 350,
  },
  leadership: {
    name: "The Commander's Keep",
    description:
      "A dungeon that forges leaders through decisions and responsibility.",
    challenges: [
      {
        title: "Identify a problem others are facing and propose a solution",
        xpReward: 150,
      },
      { title: "Take ownership of one outcome today", xpReward: 120 },
      {
        title: "Give genuine, constructive feedback to someone",
        xpReward: 130,
      },
    ],
    difficulty: "A",
    completionBonus: 300,
  },
  communication: {
    name: "The Arena of Words",
    description: "Every conversation is a battle. Clarity is your weapon.",
    challenges: [
      {
        title: "Write a clear, concise email or message with a specific goal",
        xpReward: 80,
      },
      {
        title: "Have one meaningful conversation you have been putting off",
        xpReward: 150,
      },
      {
        title: "Listen actively for 10 minutes without interrupting",
        xpReward: 100,
      },
      { title: "Reflect on how well you communicated today", xpReward: 70 },
    ],
    difficulty: "C",
    completionBonus: 250,
  },
};

// ── Service ──────────────────────────────────────────────────────────────────

export const enterDungeon = async (userId, type, io = null) => {
  const existing = await Dungeon.findOne({ userId, status: "active" });
  if (existing)
    throw new AppError(
      "You are already inside a dungeon. Complete or abandon it first.",
      409,
    );

  if (!DUNGEON_TEMPLATES[type]) throw new AppError("Unknown dungeon type.", 400);

  const generated = await generatePersonalDungeon(userId, type);
  const totalXP = generated.challenges.reduce((total, challenge) => total + challenge.xpReward, 0) + generated.completionBonus;

  const dungeon = await Dungeon.create({
    userId,
    ...generated,
    hunterLevel: generated.profile.level,
    hunterRank: generated.profile.rank,
    challenges: generated.challenges,
    totalXP,
    completionBonus: generated.completionBonus,
    startedAt: new Date(),
  });

  if (io) await emitToUser(io, userId, "dungeon:entered", { dungeon }, "progression");

  return dungeon;
};

export const getDungeons = async (userId) => {
  const [active, history] = await Promise.all([
    Dungeon.find({ userId, status: "active" }),
    Dungeon.find({ userId, status: { $in: ["completed", "abandoned"] } })
      .sort({ updatedAt: -1 })
      .limit(10),
  ]);
  return { active, history };
};

export const completeChallenge = async (
  dungeonId,
  challengeId,
  userId,
  io = null,
) => {
  const dungeon = await Dungeon.findOne({
    _id: dungeonId,
    userId,
    status: "active",
  });
  if (!dungeon) throw new AppError("Active dungeon not found.", 404);

  const challenge = dungeon.challenges.id(challengeId);
  if (!challenge) throw new AppError("Challenge not found.", 404);
  if (challenge.completed)
    throw new AppError("Challenge already completed.", 400);

  challenge.completed = true;
  challenge.completedAt = new Date();
  dungeon.earnedXP += challenge.xpReward;

  await awardXP(userId, challenge.xpReward, io);

  // Auto-complete dungeon when all challenges done
  const allDone = dungeon.challenges.every((c) => c.completed);
  if (allDone) {
    dungeon.status = "completed";
    dungeon.completedAt = new Date();
    dungeon.earnedXP += dungeon.completionBonus;

    await Promise.all([
      awardXP(userId, dungeon.completionBonus, io),
      updateStreak(userId, io),
    ]);

    if (io) await emitToUser(io, userId, "dungeon:completed", { dungeon }, "progression");
    await createNotification(
      userId,
      "dungeonCompleted",
      "DUNGEON CLEARED",
      `${dungeon.name} has been conquered. The System rewards your persistence.`,
      { dungeonId: dungeon._id },
      io,
    );
  }

  await dungeon.save();
  return dungeon;
};

export const abandonDungeon = async (dungeonId, userId) => {
  const dungeon = await Dungeon.findOneAndUpdate(
    { _id: dungeonId, userId, status: "active" },
    { status: "abandoned", abandonedAt: new Date() },
    { new: true },
  );
  if (!dungeon) throw new AppError("Active dungeon not found.", 404);
  return dungeon;
};

// ── Routes ───────────────────────────────────────────────────────────────────

const router = Router();
router.use(protect, requireAwakened, requirePlan("monarch"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getDungeons(req.userId);
    sendSuccess(res, data, "Dungeons retrieved.");
  }),
);

router.post(
  "/enter",
  [
    body("type")
      .isIn(Object.keys(DUNGEON_TEMPLATES))
      .withMessage("Invalid dungeon type"),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const dungeon = await enterDungeon(req.userId, req.body.type, io);
    sendSuccess(
      res,
      { dungeon },
      "You have entered the dungeon. Good luck, Hunter.",
      201,
    );
  }),
);

router.patch(
  "/:id/challenges/:challengeId/complete",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const dungeon = await completeChallenge(
      req.params.id,
      req.params.challengeId,
      req.userId,
      io,
    );
    sendSuccess(res, { dungeon }, "Challenge cleared.");
  }),
);

router.patch(
  "/:id/abandon",
  asyncHandler(async (req, res) => {
    const dungeon = await abandonDungeon(req.params.id, req.userId);
    sendSuccess(res, { dungeon }, "Dungeon abandoned.");
  }),
);

export default router;
