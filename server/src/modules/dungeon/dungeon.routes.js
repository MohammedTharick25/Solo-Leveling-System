import Dungeon from "./dungeon.model.js";
import { awardXP, updateStreak } from "../hunter/hunter.service.js";
import { createNotification } from "../notification/notification.service.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";

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

  const template = DUNGEON_TEMPLATES[type];
  if (!template) throw new AppError("Unknown dungeon type.", 400);

  const totalXP =
    template.challenges.reduce((a, c) => a + c.xpReward, 0) +
    template.completionBonus;

  const dungeon = await Dungeon.create({
    userId,
    type,
    name: template.name,
    description: template.description,
    difficulty: template.difficulty,
    challenges: template.challenges.map((c, i) => ({
      ...c,
      order: i,
      completed: false,
    })),
    totalXP,
    completionBonus: template.completionBonus,
    startedAt: new Date(),
  });

  if (io) io.to(`user:${userId}`).emit("dungeon:entered", { dungeon });

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

    if (io) io.to(`user:${userId}`).emit("dungeon:completed", { dungeon });
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
router.use(protect, requireAwakened);

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
