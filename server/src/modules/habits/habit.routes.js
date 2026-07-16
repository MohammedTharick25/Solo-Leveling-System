import Habit from "./habit.model.js";
import { awardXP, awardStatGains } from "../hunter/hunter.service.js";
import { checkAndAwardAchievements } from "../achievements/achievement.service.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import {
  sendSuccess,
  asyncHandler,
  startOfDay,
  endOfDay,
} from "../../lib/helpers.js";
import { Router } from "express";
import { protect, requireAwakened } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";

// ── Service ───────────────────────────────────────────────────────────────────

export const createHabit = async (userId, data) => {
  return Habit.create({ userId, ...data });
};

export const getHabits = async (userId) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun … 6=Sat
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const habits = await Habit.find({ userId, isActive: true }).sort({
    createdAt: 1,
  });

  return habits.map((h) => {
    // Determine if habit is due today
    let isDueToday = false;
    if (h.frequency === "daily") isDueToday = true;
    else if (h.frequency === "weekdays")
      isDueToday = dayOfWeek >= 1 && dayOfWeek <= 5;
    else if (h.frequency === "weekends")
      isDueToday = dayOfWeek === 0 || dayOfWeek === 6;
    else if (h.frequency === "custom")
      isDueToday = h.targetDays.includes(dayOfWeek);

    // Check if already completed today
    const completedToday = h.completions.some((c) => {
      const d = new Date(c.date);
      return d >= todayStart && d <= todayEnd;
    });

    return { ...h.toObject(), isDueToday, completedToday };
  });
};

export const completeHabit = async (habitId, userId, note = "", io = null) => {
  const habit = await Habit.findOne({ _id: habitId, userId, isActive: true });
  if (!habit) throw new AppError("Habit not found.", 404);

  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const alreadyDone = habit.completions.some((c) => {
    const d = new Date(c.date);
    return d >= todayStart && d <= todayEnd;
  });
  if (alreadyDone) throw new AppError("Habit already completed today.", 409);

  // Add completion
  habit.completions.push({ date: new Date(), note });

  // Keep only last 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  habit.completions = habit.completions.filter(
    (c) => new Date(c.date) >= cutoff,
  );

  // Update streak
  const yesterday = startOfDay(new Date(Date.now() - 86400000));
  const yesterdayEnd = endOfDay(new Date(Date.now() - 86400000));
  const completedYesterday = habit.completions.some((c) => {
    const d = new Date(c.date);
    return d >= yesterday && d <= yesterdayEnd;
  });

  if (completedYesterday || habit.currentStreak === 0) {
    habit.currentStreak += 1;
  } else {
    habit.currentStreak = 1;
  }

  if (habit.currentStreak > habit.longestStreak) {
    habit.longestStreak = habit.currentStreak;
  }

  habit.totalCompletions += 1;
  await habit.save();

  // Award XP and stat
  await awardXP(userId, habit.xpReward, io);
  if (habit.statReward?.stat) {
    await awardStatGains(userId, [habit.statReward]);
  }

  await checkAndAwardAchievements(userId, io);

  return habit;
};

export const uncompleteHabit = async (habitId, userId) => {
  const habit = await Habit.findOne({ _id: habitId, userId });
  if (!habit) throw new AppError("Habit not found.", 404);

  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const before = habit.completions.length;
  habit.completions = habit.completions.filter((c) => {
    const d = new Date(c.date);
    return !(d >= todayStart && d <= todayEnd);
  });

  if (habit.completions.length < before) {
    habit.currentStreak = Math.max(0, habit.currentStreak - 1);
    habit.totalCompletions = Math.max(0, habit.totalCompletions - 1);
    await habit.save();
  }

  return habit;
};

export const updateHabit = async (habitId, userId, data) => {
  const habit = await Habit.findOneAndUpdate({ _id: habitId, userId }, data, {
    new: true,
    runValidators: true,
  });
  if (!habit) throw new AppError("Habit not found.", 404);
  return habit;
};

export const deleteHabit = async (habitId, userId) => {
  const habit = await Habit.findOneAndUpdate(
    { _id: habitId, userId },
    { isActive: false, archivedAt: new Date() },
    { new: true },
  );
  if (!habit) throw new AppError("Habit not found.", 404);
  return habit;
};

export const getHabitStats = async (userId) => {
  const habits = await Habit.find({ userId, isActive: true });
  const today = startOfDay();
  const todayEnd = endOfDay();
  const last7 = new Date(Date.now() - 7 * 86400000);
  const last30 = new Date(Date.now() - 30 * 86400000);

  const stats = habits.map((h) => {
    const completionsLast7 = h.completions.filter(
      (c) => new Date(c.date) >= last7,
    ).length;
    const completionsLast30 = h.completions.filter(
      (c) => new Date(c.date) >= last30,
    ).length;
    const completedToday = h.completions.some((c) => {
      const d = new Date(c.date);
      return d >= today && d <= todayEnd;
    });
    return {
      habitId: h._id,
      name: h.name,
      icon: h.icon,
      currentStreak: h.currentStreak,
      longestStreak: h.longestStreak,
      completedToday,
      completionsLast7,
      completionsLast30,
      consistency7d: Math.round((completionsLast7 / 7) * 100),
    };
  });

  return {
    totalHabits: habits.length,
    completedToday: stats.filter((s) => s.completedToday).length,
    longestCurrentStreak: Math.max(0, ...habits.map((h) => h.currentStreak)),
    habits: stats,
  };
};

// ── Routes ────────────────────────────────────────────────────────────────────

const createValidators = [
  body("name").notEmpty().trim().withMessage("Name required"),
  body("frequency")
    .optional()
    .isIn(["daily", "weekdays", "weekends", "custom"]),
  body("category")
    .optional()
    .isIn([
      "health",
      "learning",
      "discipline",
      "focus",
      "communication",
      "creativity",
      "finance",
      "other",
    ]),
  validate,
];

const router = Router();
router.use(protect, requireAwakened);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const habits = await getHabits(req.userId);
    sendSuccess(res, { habits }, "Habits retrieved.");
  }),
);

router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const stats = await getHabitStats(req.userId);
    sendSuccess(res, { stats }, "Habit stats retrieved.");
  }),
);

router.post(
  "/",
  createValidators,
  asyncHandler(async (req, res) => {
    const habit = await createHabit(req.userId, req.body);
    sendSuccess(res, { habit }, "Habit created.", 201);
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const habit = await updateHabit(req.params.id, req.userId, req.body);
    sendSuccess(res, { habit }, "Habit updated.");
  }),
);

router.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const habit = await completeHabit(
      req.params.id,
      req.userId,
      req.body.note,
      io,
    );
    sendSuccess(res, { habit }, "Habit completed. XP awarded.");
  }),
);

router.delete(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const habit = await uncompleteHabit(req.params.id, req.userId);
    sendSuccess(res, { habit }, "Habit completion removed.");
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteHabit(req.params.id, req.userId);
    sendSuccess(res, {}, "Habit archived.");
  }),
);

export default router;
