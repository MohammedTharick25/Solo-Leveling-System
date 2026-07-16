import TaskRaid from "./taskRaid.model.js";
import {
  awardXP,
  awardStatGains,
  updateStreak,
} from "../hunter/hunter.service.js";
import { questXPReward } from "../../lib/xpFormulas.js";
import Hunter from "../hunter/hunter.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";

const DIFFICULTY_XP = { F: 20, E: 40, D: 75, C: 120, B: 200, A: 320, S: 500 };

// ── Service ──────────────────────────────────────────────────────────────────

export const createRaid = async (userId, data) => {
  const xpReward = DIFFICULTY_XP[data.difficulty] || 75;
  return TaskRaid.create({ userId, ...data, xpReward });
};

export const getRaids = async (
  userId,
  { status, priority, page = 1, limit = 20 } = {},
) => {
  const query = { userId };
  if (status) query.status = status;
  if (priority) query.priority = priority;
  const skip = (page - 1) * limit;
  const [raids, total] = await Promise.all([
    TaskRaid.find(query)
      .sort({ priority: -1, dueAt: 1 })
      .skip(skip)
      .limit(limit),
    TaskRaid.countDocuments(query),
  ]);
  return { raids, total, page, pages: Math.ceil(total / limit) };
};

export const startRaid = async (raidId, userId) => {
  const raid = await TaskRaid.findOneAndUpdate(
    { _id: raidId, userId, status: "pending" },
    { status: "inProgress", startedAt: new Date() },
    { new: true },
  );
  if (!raid) throw new AppError("Raid not found or already started.", 404);
  return raid;
};

export const completeRaid = async (raidId, userId, notes, io = null) => {
  const raid = await TaskRaid.findOne({
    _id: raidId,
    userId,
    status: { $in: ["pending", "inProgress"] },
  });
  if (!raid) throw new AppError("Raid not found or already finished.", 404);

  const completedAt = new Date();
  const actualMinutes = raid.startedAt
    ? Math.round((completedAt - raid.startedAt) / 60000)
    : raid.estimatedMinutes;

  raid.status = "completed";
  raid.completedAt = completedAt;
  raid.actualMinutes = actualMinutes;
  if (notes) raid.notes = notes;
  await raid.save();

  await Promise.all([
    awardXP(userId, raid.xpReward, io),
    awardStatGains(userId, raid.statRewards),
    updateStreak(userId, io),
  ]);

  return raid;
};

export const deleteRaid = async (raidId, userId) => {
  const raid = await TaskRaid.findOneAndDelete({
    _id: raidId,
    userId,
    status: "pending",
  });
  if (!raid)
    throw new AppError(
      "Raid not found or cannot be deleted after starting.",
      404,
    );
  return raid;
};

export const updateSubtask = async (raidId, subtaskId, userId, completed) => {
  const raid = await TaskRaid.findOne({ _id: raidId, userId });
  if (!raid) throw new AppError("Raid not found.", 404);
  const sub = raid.subtasks.id(subtaskId);
  if (!sub) throw new AppError("Subtask not found.", 404);
  sub.completed = completed;
  await raid.save();
  return raid;
};

// ── Routes ───────────────────────────────────────────────────────────────────

const createValidators = [
  body("title").notEmpty().trim().withMessage("Title required"),
  body("difficulty").optional().isIn(["F", "E", "D", "C", "B", "A", "S"]),
  body("priority").optional().isIn(["low", "medium", "high", "critical"]),
  validate,
];

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await getRaids(req.userId, req.query);
    sendSuccess(res, result, "Raids retrieved.");
  }),
);

router.post(
  "/",
  createValidators,
  asyncHandler(async (req, res) => {
    const raid = await createRaid(req.userId, req.body);
    sendSuccess(res, { raid }, "Raid created.", 201);
  }),
);

router.patch(
  "/:id/start",
  asyncHandler(async (req, res) => {
    const raid = await startRaid(req.params.id, req.userId);
    sendSuccess(res, { raid }, "Raid started. Enter the dungeon.");
  }),
);

router.patch(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const raid = await completeRaid(
      req.params.id,
      req.userId,
      req.body.notes,
      io,
    );
    sendSuccess(res, { raid }, "Raid complete. Spoils collected.");
  }),
);

router.patch(
  "/:id/subtasks/:subtaskId",
  asyncHandler(async (req, res) => {
    const raid = await updateSubtask(
      req.params.id,
      req.params.subtaskId,
      req.userId,
      req.body.completed,
    );
    sendSuccess(res, { raid }, "Subtask updated.");
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteRaid(req.params.id, req.userId);
    sendSuccess(res, {}, "Raid abandoned.");
  }),
);

export default router;
