import TaskRaid from "./taskRaid.model.js";
import {
  awardXP,
  awardStatGains,
  updateStreakOnQuestComplete,
} from "../hunter/hunter.service.js";
import { questXPReward } from "../../lib/xpFormulas.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";

const DIFFICULTY_XP = { F: 20, E: 40, D: 75, C: 120, B: 200, A: 320, S: 500 };

// ── Service ───────────────────────────────────────────────────────────────────

export const createRaid = async (userId, data) => {
  const xpReward = DIFFICULTY_XP[data.difficulty] || 75;
  return TaskRaid.create({ userId, ...data, xpReward });
};

export const getRaids = async (
  userId,
  { status, priority, page = 1, limit = 20, includeTemplates = false } = {},
) => {
  const query = { userId };
  if (status) query.status = status;
  if (priority) query.priority = priority;
  // By default hide template raids (shown separately)
  if (!includeTemplates) query.isTemplate = { $ne: true };

  const skip = (page - 1) * limit;
  const [raids, total] = await Promise.all([
    TaskRaid.find(query)
      .sort({ priority: -1, dueAt: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TaskRaid.countDocuments(query),
  ]);
  return { raids, total, page, pages: Math.ceil(total / limit) };
};

export const getRecurringTemplates = async (userId) => {
  return TaskRaid.find({ userId, isTemplate: true, isRecurring: true }).sort({
    createdAt: -1,
  });
};

/**
 * Generate today's instance of a recurring raid if not already done.
 */
export const generateRecurringInstances = async (userId) => {
  const templates = await TaskRaid.find({
    userId,
    isTemplate: true,
    isRecurring: true,
  });
  const today = new Date();
  const dayOfWeek = today.getDay();
  const created = [];

  for (const tmpl of templates) {
    let isDueToday = false;
    if (tmpl.recurringFrequency === "daily") isDueToday = true;
    if (tmpl.recurringFrequency === "weekdays")
      isDueToday = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (tmpl.recurringFrequency === "weekly")
      isDueToday = (tmpl.recurringDays || [1]).includes(dayOfWeek);
    if (tmpl.recurringFrequency === "monthly")
      isDueToday = today.getDate() === 1;

    if (!isDueToday) continue;

    // Check if an instance was already created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const existing = await TaskRaid.findOne({
      userId,
      parentRaidId: tmpl._id,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    if (existing) continue;

    const dueAt = new Date();
    dueAt.setHours(23, 59, 59, 999);
    const instance = await TaskRaid.create({
      userId,
      title: tmpl.title,
      description: tmpl.description,
      category: tmpl.category,
      difficulty: tmpl.difficulty,
      priority: tmpl.priority,
      xpReward: tmpl.xpReward,
      statRewards: tmpl.statRewards,
      estimatedMinutes: tmpl.estimatedMinutes,
      tags: tmpl.tags,
      status: "pending",
      isRecurring: false,
      isTemplate: false,
      parentRaidId: tmpl._id,
      dueAt,
    });
    tmpl.lastGeneratedAt = new Date();
    await tmpl.save();
    created.push(instance);
  }

  return created;
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
    throw new AppError("Raid not found or cannot delete after starting.", 404);
  return raid;
};

export const deleteTemplate = async (raidId, userId) => {
  const raid = await TaskRaid.findOneAndDelete({
    _id: raidId,
    userId,
    isTemplate: true,
  });
  if (!raid) throw new AppError("Template not found.", 404);
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

// ── Routes ────────────────────────────────────────────────────────────────────

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

router.get(
  "/recurring",
  asyncHandler(async (req, res) => {
    // Also generate today's instances on fetch
    await generateRecurringInstances(req.userId);
    const templates = await getRecurringTemplates(req.userId);
    sendSuccess(res, { templates }, "Recurring templates retrieved.");
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

router.post(
  "/recurring",
  [
    body("title").notEmpty().trim().withMessage("Title required"),
    body("recurringFrequency")
      .isIn(["daily", "weekdays", "weekly", "monthly"])
      .withMessage("Frequency required"),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const xpReward = DIFFICULTY_XP[req.body.difficulty] || 75;
    const template = await TaskRaid.create({
      userId: req.userId,
      ...req.body,
      xpReward,
      isRecurring: true,
      isTemplate: true,
      status: "pending",
    });
    // Immediately generate today's instance
    await generateRecurringInstances(req.userId);
    sendSuccess(res, { template }, "Recurring raid created.", 201);
  }),
);

router.patch(
  "/:id/start",
  asyncHandler(async (req, res) => {
    const raid = await startRaid(req.params.id, req.userId);
    sendSuccess(res, { raid }, "Raid started.");
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
  "/recurring/:id",
  asyncHandler(async (req, res) => {
    await deleteTemplate(req.params.id, req.userId);
    sendSuccess(res, {}, "Recurring template deleted.");
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
