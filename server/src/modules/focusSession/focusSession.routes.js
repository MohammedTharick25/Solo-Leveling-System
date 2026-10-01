import FocusSession from "./focusSession.model.js";
import { awardXP, updateStreak } from "../hunter/hunter.service.js";
import Hunter from "../hunter/hunter.model.js";
import { focusSessionXP } from "../../lib/xpFormulas.js";
import { createNotification } from "../notification/notification.service.js";
import { computeAndSaveStats } from "../stats/stats.service.js";
import Quest from "../quest/quest.model.js";
import { updateQuestProgress } from "../quest/quest.service.js";
import Goal from "../goals/goal.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";

// ── Service ──────────────────────────────────────────────────────────────────

export const startSession = async (
  userId,
  { type, plannedDuration, linkedRaidId, linkedQuestId, linkedGoalId, tags },
) => {
  let effectiveGoalId = linkedGoalId || null;
  if (linkedQuestId) {
    const linkedQuest = await Quest.findOne({
      _id: linkedQuestId,
      userId,
      status: "active",
    })
      .select("_id goalId")
      .lean();
    if (!linkedQuest) throw new AppError("Linked quest is not active.", 404);
    if (effectiveGoalId && String(effectiveGoalId) !== String(linkedQuest.goalId || "")) {
      throw new AppError("Linked quest does not belong to the selected goal.", 400);
    }
    effectiveGoalId = effectiveGoalId || linkedQuest.goalId || null;
  }

  if (effectiveGoalId) {
    const linkedGoal = await Goal.findOne({
      _id: effectiveGoalId,
      userId,
      status: "active",
    })
      .select("_id")
      .lean();
    if (!linkedGoal) throw new AppError("Linked goal is not active.", 404);
  }

  // Auto-close any stuck open session instead of blocking the user
  const existing = await FocusSession.findOne({ userId, endedAt: null });
  if (existing) {
    const endedAt = new Date();
    const actualDuration = Math.max(
      1,
      Math.round((endedAt - existing.startedAt) / 60000),
    );
    existing.endedAt = endedAt;
    existing.actualDuration = actualDuration;
    existing.completed = false;
    existing.interrupted = true;
    existing.focusScore = 0;
    existing.xpEarned = 0;
    existing.skillXpEarned = 0;
    await existing.save();
  }

  return FocusSession.create({
    userId,
    type,
    plannedDuration,
    linkedRaidId: linkedRaidId || null,
    linkedQuestId: linkedQuestId || null,
    linkedGoalId: effectiveGoalId,
    tags: tags || [],
    startedAt: new Date(),
    pausedDurationSeconds: 0,
  });
};

const getElapsedSeconds = (session, at = new Date()) => {
  const end = session.pausedAt || at;
  return Math.max(
    0,
    Math.floor((end.getTime() - session.startedAt.getTime()) / 1000) -
      (session.pausedDurationSeconds || 0),
  );
};

export const pauseSession = async (userId, sessionId) => {
  const session = await FocusSession.findOne({
    _id: sessionId,
    userId,
    endedAt: null,
  });
  if (!session) throw new AppError("Active focus session not found.", 404);
  if (!session.pausedAt) {
    session.pausedAt = new Date();
    await session.save();
  }
  return session;
};

export const resumeSession = async (userId, sessionId) => {
  const session = await FocusSession.findOne({
    _id: sessionId,
    userId,
    endedAt: null,
  });
  if (!session) throw new AppError("Active focus session not found.", 404);
  if (session.pausedAt) {
    session.pausedDurationSeconds += Math.max(
      0,
      Math.floor((Date.now() - session.pausedAt.getTime()) / 1000),
    );
    session.pausedAt = null;
    await session.save();
  }
  return session;
};

export const forceEndAllSessions = async (userId) => {
  const endedAt = new Date();
  await FocusSession.updateMany(
    { userId, endedAt: null },
    {
      endedAt,
      completed: false,
      interrupted: true,
      actualDuration: 0,
      focusScore: 0,
      xpEarned: 0,
      skillXpEarned: 0,
      pausedAt: null,
    },
  );
};

export const endSession = async (
  userId,
  sessionId,
  { interrupted, interruptionCount, notes },
  io = null,
) => {
  const session = await FocusSession.findOne({
    _id: sessionId,
    userId,
    endedAt: null,
  });
  if (!session) throw new AppError("Session not found or already ended.", 404);

  const endedAt = new Date();
  const elapsedSeconds = getElapsedSeconds(session, endedAt);
  const actualDuration = Math.round(elapsedSeconds / 60);
  const completed =
    !interrupted && elapsedSeconds >= session.plannedDuration * 60 * 0.8;

  const focusScore = completed
    ? Math.min(100, 60 + (actualDuration / session.plannedDuration) * 40)
    : Math.floor((actualDuration / session.plannedDuration) * 60);

  const xpEarned = focusSessionXP(
    session.plannedDuration,
    actualDuration,
    completed,
  );
  const skillXpEarned = Math.floor(xpEarned * 0.5);

  session.endedAt = endedAt;
  session.actualDuration = actualDuration;
  session.completed = completed;
  session.interrupted = interrupted || false;
  session.interruptionCount = interruptionCount || 0;
  session.focusScore = Math.floor(focusScore);
  session.xpEarned = xpEarned;
  session.skillXpEarned = skillXpEarned;
  session.notes = notes || "";
  session.pausedAt = null;
  await session.save();

  const [xpResult] = await Promise.all([
    awardXP(userId, xpEarned, io),
    updateStreak(userId, io),
    Hunter.findOneAndUpdate(
      { userId },
      { $inc: { totalFocusMinutes: actualDuration } },
    ),
  ]);
  session.xpEarned = xpResult.xpEarned;
  await session.save();

  // Refresh focus-based productivity scores as soon as the session ends.
  if (session.linkedGoalId && actualDuration > 0) {
    try {
      await Goal.updateOne(
        { _id: session.linkedGoalId, userId },
        { $inc: { focusMinutes: actualDuration } },
      );
    } catch (error) {
      console.error("[FOCUS] Could not update linked goal focus time:", error.message);
    }
  }

  if (session.linkedQuestId && actualDuration > 0) {
    try {
      const linkedQuest = await Quest.findOne({
        _id: session.linkedQuestId,
        userId,
        status: "active",
      })
        .select("_id currentValue unit")
        .lean();
      const unit = (linkedQuest?.unit || "").trim().toLowerCase();
      if (linkedQuest && ["minute", "minutes", "min"].includes(unit)) {
        await updateQuestProgress(
          linkedQuest._id,
          userId,
          (linkedQuest.currentValue || 0) + actualDuration,
          io,
        );
      }
    } catch (error) {
      console.error("[FOCUS] Could not update linked quest progress:", error.message);
    }
  }

  try {
    await computeAndSaveStats(userId);
  } catch (error) {
    console.error("[FOCUS] Could not refresh productivity stats:", error.message);
  }

  return session;
};

export const getSessionHistory = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [sessions, total] = await Promise.all([
    FocusSession.find({ userId })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("linkedQuestId", "title unit category")
      .populate("linkedGoalId", "title"),
    FocusSession.countDocuments({ userId }),
  ]);
  return { sessions, total, page, pages: Math.ceil(total / limit) };
};

export const getActiveSession = async (userId) => {
  return FocusSession.findOne({ userId, endedAt: null })
    .populate("linkedQuestId", "title unit category")
    .populate("linkedGoalId", "title");
};

export const getSkillStats = async (userId) => {
  const sessions = await FocusSession.find({ userId });
  const completed = sessions.filter((s) => s.completed);
  const totalMinutes = sessions.reduce(
    (acc, s) => acc + (s.actualDuration || 0),
    0,
  );
  const totalXP = sessions.reduce((acc, s) => acc + (s.skillXpEarned || 0), 0);

  let skillLevel = "Beginner";
  if (totalMinutes >= 3000) skillLevel = "Master";
  else if (totalMinutes >= 1000) skillLevel = "Advanced";
  else if (totalMinutes >= 300) skillLevel = "Intermediate";

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    totalFocusMinutes: totalMinutes,
    totalSkillXP: totalXP,
    skillLevel,
    averageFocusScore: completed.length
      ? Math.floor(
          completed.reduce((acc, s) => acc + s.focusScore, 0) /
            completed.length,
        )
      : 0,
  };
};

// ── Controller + Routes ──────────────────────────────────────────────────────

const startValidators = [
  body("type")
    .isIn(["pomodoro", "deepWork", "study", "reading"])
    .withMessage("Invalid session type"),
  body("plannedDuration")
    .isInt({ min: 1, max: 240 })
    .withMessage("Duration must be 1-240 minutes"),
  body("linkedQuestId")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Linked quest ID must be valid"),
  body("linkedGoalId")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Linked goal ID must be valid"),
  validate,
];

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/active",
  asyncHandler(async (req, res) => {
    const session = await getActiveSession(req.userId);
    sendSuccess(
      res,
      { session },
      session ? "Active session found." : "No active session.",
    );
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await getSessionHistory(
      req.userId,
      req.query.page,
      req.query.limit,
    );
    sendSuccess(res, result, "Focus sessions retrieved.");
  }),
);

router.get(
  "/skill-stats",
  asyncHandler(async (req, res) => {
    const stats = await getSkillStats(req.userId);
    sendSuccess(res, { stats }, "Skill stats retrieved.");
  }),
);

router.post(
  "/start",
  startValidators,
  asyncHandler(async (req, res) => {
    const session = await startSession(req.userId, req.body);
    sendSuccess(
      res,
      { session },
      "Focus session started. Enter the zone.",
      201,
    );
  }),
);

router.patch(
  "/:id/pause",
  asyncHandler(async (req, res) => {
    const session = await pauseSession(req.userId, req.params.id);
    sendSuccess(res, { session }, "Focus session paused.");
  }),
);

router.patch(
  "/:id/resume",
  asyncHandler(async (req, res) => {
    const session = await resumeSession(req.userId, req.params.id);
    sendSuccess(res, { session }, "Focus session resumed.");
  }),
);

router.patch(
  "/:id/end",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const session = await endSession(req.userId, req.params.id, req.body, io);
    sendSuccess(res, { session }, "Session ended. XP awarded.");
  }),
);

// Force-close ALL open sessions for this user — emergency reset
router.delete(
  "/force-end",
  asyncHandler(async (req, res) => {
    await forceEndAllSessions(req.userId);
    sendSuccess(res, {}, "All open sessions force-closed.");
  }),
);

export default router;
