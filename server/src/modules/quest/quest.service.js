import Quest from "./quest.model.js";
import Hunter from "../hunter/hunter.model.js";
import User from "../user/user.model.js";
import Stats from "../stats/stats.model.js";
import {
  awardXP,
  awardStatGains,
  updateStreakOnQuestComplete,
} from "../hunter/hunter.service.js";
import { checkShadowUnlocks } from "../shadow/shadow.service.js";
import { checkBossSpawn } from "../boss/boss.service.js";
import { createNotification } from "../notification/notification.service.js";
import { emitToUser } from "../../infrastructure/socket/socketManager.js";
import { questXPReward } from "../../lib/xpFormulas.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { checkAndAwardAchievements } from "../achievements/achievement.service.js";
import { generateJSON, isCloudAIConfigured } from "../../lib/ai/ai.service.js";
import { buildDailyQuestPrompt } from "../../lib/ai/ai.prompts.js";

const DAILY_QUEST_COUNT = 5;

// ── Use LOCAL date boundaries (not UTC) so timezone doesn't break "today" ────
const localStartOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const localEndOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const STAT_TO_CATEGORY = {
  discipline: "discipline",
  sense: "focus",
  vitality: "health",
  strength: "health",
  intelligence: "learning",
  agility: "productivity",
  communication: "communication",
  leadership: "leadership",
  creativity: "creativity",
  financialIntelligence: "finance",
  problemSolving: "productivity",
  emotionalControl: "emotionalControl",
  timeManagement: "timeManagement",
};

const CATEGORY_KEYWORDS = {
  learning: ["learn", "study", "course", "coding", "programming", "javascript", "system design", "book", "read", "exam", "skill"],
  health: ["health", "fitness", "workout", "exercise", "run", "walk", "gym", "strength", "sleep"],
  career: ["career", "job", "promotion", "work", "portfolio", "interview", "business", "company"],
  finance: ["finance", "money", "saving", "budget", "invest", "investment"],
  communication: ["speak", "speaking", "communication", "presentation", "english", "network"],
  leadership: ["lead", "leadership", "team", "manager", "management"],
  creativity: ["write", "writing", "design", "creative", "art", "music", "content"],
  productivity: ["productivity", "focus", "procrastination", "consistency", "routine", "discipline", "time"],
  emotionalControl: ["stress", "calm", "mindful", "mindfulness", "emotion", "journal", "confidence"],
  timeManagement: ["time", "schedule", "planning", "organize", "organization"],
};

const normalizeProfileText = (values = []) =>
  values.filter(Boolean).join(" ").toLowerCase();

const getProfileCategoryPriority = (user) => {
  const awakening = user?.awakening || {};
  const text = normalizeProfileText([
    ...(awakening.goals || []),
    ...(awakening.learningInterests || []),
    ...(awakening.biggestWeaknesses || []),
    awakening.occupation,
    awakening.longTermVision,
  ]);

  const scores = Object.fromEntries(Object.keys(CATEGORY_KEYWORDS).map((category) => [category, 0]));
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = keywords.reduce((score, keyword) =>
      score + (text.includes(keyword) ? 1 : 0), 0);
  }

  const fitness = awakening.fitnessLevel;
  if (fitness && fitness !== "sedentary") scores.health += 3;
  if (fitness === "sedentary") scores.health += 1;
  if (awakening.isStudent) scores.learning += 2;
  if (awakening.biggestWeaknesses?.length) scores.discipline += 2;
  if (Number(awakening.availableDailyMinutes) <= 30) scores.timeManagement += 2;

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .map(([category]) => category);
};

const personalizedFallbackQuests = (user) => {
  const awakening = user?.awakening || {};
  const goal = awakening.goals?.[0] || "your most important goal";
  const interest = awakening.learningInterests?.[0] || "a skill you want to improve";
  const fitness = awakening.fitnessLevel;
  const available = Number(awakening.availableDailyMinutes) || 60;
  const exerciseMinutes = Math.max(10, Math.min(25, Math.floor(available * 0.25)));

  return [
    {
      title: `Goal Sprint: ${goal}`.slice(0, 120),
      description: `Spend ${Math.min(25, Math.max(15, Math.floor(available * 0.3)))} focused minutes on the smallest useful step toward ${goal}.`,
      category: "productivity", difficulty: "D", xpReward: 65, targetValue: 1, unit: "session",
      statRewards: [{ stat: "discipline", amount: 3 }],
    },
    {
      title: `Learn: ${interest}`.slice(0, 120),
      description: `Practice or study ${interest} for 15 focused minutes and write down one thing you learned.`,
      category: "learning", difficulty: "E", xpReward: 55, targetValue: 15, unit: "minutes",
      statRewards: [{ stat: "intelligence", amount: 3 }],
    },
    {
      title: fitness === "sedentary" ? "Movement Reset" : "Training Sprint",
      description: fitness === "sedentary"
        ? `Take a ${exerciseMinutes}-minute walk or do gentle movement.`
        : `Complete ${exerciseMinutes} minutes of exercise at a comfortable intensity.`,
      category: "health", difficulty: "E", xpReward: 55, targetValue: exerciseMinutes, unit: "minutes",
      statRewards: [{ stat: "vitality", amount: 3 }],
    },
    {
      title: "Distraction Breaker",
      description: "Choose one task, remove one distraction, and work on it until the timer ends.",
      category: "focus", difficulty: "D", xpReward: 60, targetValue: 1, unit: "session",
      statRewards: [{ stat: "sense", amount: 3 }],
    },
    {
      title: "Daily Reflection",
      description: "Write one win, one lesson, and the first task you want to tackle tomorrow.",
      category: "emotionalControl", difficulty: "E", xpReward: 40, targetValue: 1, unit: "entry",
      statRewards: [{ stat: "emotionalControl", amount: 2 }],
    },
  ];
};


const AI_QUEST_CATEGORIES = new Set([
  "focus", "discipline", "health", "learning", "communication", "leadership",
  "productivity", "creativity", "finance", "emotionalControl", "timeManagement",
]);
const AI_QUEST_DIFFICULTIES = new Set(["F", "E", "D", "C", "B", "A", "S"]);
const CATEGORY_DEFAULT_STAT = {
  focus: "sense", discipline: "discipline", health: "vitality", learning: "intelligence",
  communication: "communication", leadership: "leadership", productivity: "problemSolving",
  creativity: "creativity", finance: "financialIntelligence", emotionalControl: "emotionalControl",
  timeManagement: "timeManagement",
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const cleanAIQuest = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.title || "").trim();
  const description = String(raw.description || "").trim();
  const category = String(raw.category || "").trim();
  const difficulty = String(raw.difficulty || "E").trim().toUpperCase();
  const unit = String(raw.unit || "session").trim().toLowerCase();
  if (!title || !description || !AI_QUEST_CATEGORIES.has(category) || !AI_QUEST_DIFFICULTIES.has(difficulty)) return null;
  return {
    title: title.slice(0, 120),
    description: description.slice(0, 500),
    purpose: String(raw.purpose || "Personalized daily progress").trim().slice(0, 300),
    category,
    difficulty,
    xpReward: clamp(Number(raw.xpReward) || 50, 30, 100),
    targetValue: unit === "session" || unit === "entry" ? 1 : clamp(Number(raw.targetValue) || 10, 5, 180),
    unit: unit.slice(0, 30),
    stat: CATEGORY_DEFAULT_STAT[category],
    statAmount: clamp(Number(raw.statAmount) || 3, 1, 8),
    expectedOutcome: String(raw.expectedOutcome || description).trim().slice(0, 300),
  };
};

const createAIQuestsForUser = async ({ userId, user, hunter, stats, slotsNeeded }) => {
  if (!isCloudAIConfigured()) return [];
  const profile = {
    age: user.awakening?.age,
    occupation: user.awakening?.occupation,
    isStudent: user.awakening?.isStudent,
    goals: user.awakening?.goals || [],
    wakeTime: user.awakening?.dailySchedule?.wakeTime,
    sleepTime: user.awakening?.dailySchedule?.sleepTime,
    fitnessLevel: user.awakening?.fitnessLevel,
    learningInterests: user.awakening?.learningInterests || [],
    currentHabits: user.awakening?.currentHabits || [],
    biggestWeaknesses: user.awakening?.biggestWeaknesses || [],
    biggestStrengths: user.awakening?.biggestStrengths || [],
    availableDailyMinutes: user.awakening?.availableDailyMinutes,
    longTermVision: user.awakening?.longTermVision,
  };

  const result = await generateJSON({
    prompt: buildDailyQuestPrompt({
      user: profile,
      hunter: {
        level: hunter.level,
        rank: hunter.rank,
        currentStreak: hunter.currentStreak,
        totalXP: hunter.totalXP,
      },
      stats: stats ? LIFE_STATS.reduce((acc, name) => {
        acc[name] = stats[name]?.value ?? 0;
        return acc;
      }, {}) : {},
      currentDate: new Date().toISOString().slice(0, 10),
    }),
  });

  const seen = new Set();
  const valid = (Array.isArray(result?.quests) ? result.quests : [])
    .map(cleanAIQuest)
    .filter(Boolean)
    .filter((quest) => {
      const key = quest.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (valid.length !== 5) {
    throw new Error(`AI returned ${valid.length} valid daily quests; exactly 5 are required.`);
  }

  const created = [];
  for (const q of valid.slice(0, slotsNeeded)) {
    created.push(await Quest.create({
      userId,
      title: q.title,
      description: q.description,
      purpose: q.purpose,
      category: q.category,
      difficulty: q.difficulty,
      xpReward: q.xpReward,
      statRewards: [{ stat: q.stat, amount: q.statAmount }],
      expectedOutcome: q.expectedOutcome,
      generatedReason: "Personalized from your Awakening profile",
      targetValue: q.targetValue,
      unit: q.unit,
      evolutionLevel: 1,
      dueAt: localEndOfDay(),
      isSystemGenerated: true,
    }));
  }
  return created;
};

const LIFE_STATS = [
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

// Fallback quest templates if DB has none seeded yet
const FALLBACK_QUESTS = [
  {
    title: "Morning Activation",
    description: "Complete a 10-minute morning routine.",
    category: "discipline",
    difficulty: "E",
    xpReward: 50,
    targetValue: 1,
    unit: "session",
    statRewards: [{ stat: "discipline", amount: 2 }],
  },
  {
    title: "Focus Session",
    description: "Complete one 25-minute Pomodoro session.",
    category: "focus",
    difficulty: "D",
    xpReward: 60,
    targetValue: 1,
    unit: "session",
    statRewards: [{ stat: "sense", amount: 3 }],
  },
  {
    title: "Physical Activity",
    description: "Do at least 20 minutes of exercise or walking.",
    category: "health",
    difficulty: "D",
    xpReward: 70,
    targetValue: 20,
    unit: "minutes",
    statRewards: [{ stat: "strength", amount: 3 }],
  },
  {
    title: "Read or Learn Something",
    description: "Read for 15 minutes or complete one lesson.",
    category: "learning",
    difficulty: "E",
    xpReward: 55,
    targetValue: 15,
    unit: "minutes",
    statRewards: [{ stat: "intelligence", amount: 3 }],
  },
  {
    title: "Evening Reflection",
    description: "Write a short journal entry for today.",
    category: "emotionalControl",
    difficulty: "E",
    xpReward: 40,
    targetValue: 1,
    unit: "entry",
    statRewards: [{ stat: "emotionalControl", amount: 2 }],
  },
];

/**
 * Generate exactly DAILY_QUEST_COUNT quests for today.
 * Uses local time (not UTC) to avoid timezone boundary issues.
 * Uses cloud AI as the primary generator and a profile-aware local backup if AI is unavailable.
 */
export const generateQuestsForUser = async (userId, io = null) => {
  const todayStart = localStartOfDay();
  const todayEnd = localEndOfDay();

  // Count quests created today (local time)
  const todaysQuestCount = await Quest.countDocuments({
    userId,
    createdAt: { $gte: todayStart, $lte: todayEnd },
  });

  if (todaysQuestCount >= DAILY_QUEST_COUNT) {
    console.log(
      `[QUEST] User ${userId} already has ${todaysQuestCount} quests today`,
    );
    return [];
  }

  const slotsNeeded = DAILY_QUEST_COUNT - todaysQuestCount;

  const [stats, hunter, user] = await Promise.all([
    Stats.findOne({ userId }),
    Hunter.findOne({ userId }),
    User.findById(userId).select("awakening"),
  ]);

  if (!hunter) {
    console.warn(`[QUEST] Hunter not found for user ${userId}`);
    return [];
  }

  let newQuests = [];
  let aiGenerationFailed = false;

  // Cloud AI is the primary daily quest generator. The user's Awakening
  // profile is passed to the model so every new day is personalized.
  if (isCloudAIConfigured()) {
    try {
      newQuests = await createAIQuestsForUser({
        userId,
        user,
        hunter,
        stats,
        slotsNeeded,
      });
      console.log(`[QUEST] Generated ${newQuests.length} AI-personalized quests for user ${userId}`);
    } catch (error) {
      aiGenerationFailed = true;
      console.error(`[QUEST] AI daily quest generation failed for user ${userId}:`, error.message);
    }
  }

  // Safe local backup. This is only reached when AI is not configured or the
  // provider returns an invalid response/error.
  if (newQuests.length === 0) {
    const personalized = personalizedFallbackQuests(user);
    const toCreate = personalized.slice(
      todaysQuestCount,
      todaysQuestCount + slotsNeeded,
    );

    for (const q of toCreate) {
      const quest = await Quest.create({
        userId,
        title: q.title,
        description: q.description,
        purpose: `Build your ${q.category} skill`,
        category: q.category,
        difficulty: q.difficulty,
        xpReward: q.xpReward,
        statRewards: q.statRewards,
        targetValue: q.targetValue,
        unit: q.unit,
        generatedReason: aiGenerationFailed
          ? "Personalized local backup because AI was temporarily unavailable"
          : "Personalized daily assignment",
        evolutionLevel: 1,
        dueAt: localEndOfDay(),
        isSystemGenerated: true,
      });
      newQuests.push(quest);
    }
  }

  if (newQuests.length > 0) {
    console.log(
      `[QUEST] Generated ${newQuests.length} quests for user ${userId}`,
    );
    if (io)
      await emitToUser(io, userId, "system:quest-assigned", {
        count: newQuests.length,
      }, "questUpdates");
    await createNotification(
      userId,
      "questAssigned",
      "DAILY QUESTS ASSIGNED",
      `The System has assigned ${newQuests.length} quest${newQuests.length > 1 ? "s" : ""} for today. Complete all ${DAILY_QUEST_COUNT} to maintain your streak.`,
      { questCount: newQuests.length },
      io,
    );
  }

  return newQuests;
};

/**
 * Get today's quests (local time).
 * Auto-generates if none exist yet for today.
 */
export const getTodaysQuests = async (userId, io = null) => {
  const todayStart = localStartOfDay();
  const todayEnd = localEndOfDay();

  let quests = await Quest.find({
    userId,
    createdAt: { $gte: todayStart, $lte: todayEnd },
  }).sort({ status: 1, createdAt: 1 });

  // Keep the daily set at exactly 5 quests and repair partial generations.
  if (quests.length < DAILY_QUEST_COUNT) {
    console.log(
      `[QUEST] ${quests.length}/${DAILY_QUEST_COUNT} quests found for user ${userId} today — generating the missing quests`,
    );
    await generateQuestsForUser(userId, io);
    quests = await Quest.find({
      userId,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }).sort({ status: 1, createdAt: 1 });
  }

  const total = quests.length;
  const completed = quests.filter((q) => q.status === "completed").length;
  const allDone = total > 0 && completed >= total;

  return { quests, total, completed, allDone };
};

export const getActiveQuests = async (userId) => {
  const { quests } = await getTodaysQuests(userId);
  return quests.filter((q) => q.status === "active");
};

export const getQuestHistory = async (userId, page = 1, limit = 20) => {
  const todayStart = localStartOfDay();
  const skip = (page - 1) * limit;
  const [quests, total] = await Promise.all([
    Quest.find({
      userId,
      status: { $in: ["completed", "failed", "expired"] },
      createdAt: { $lt: todayStart },
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Quest.countDocuments({
      userId,
      status: { $in: ["completed", "failed", "expired"] },
      createdAt: { $lt: todayStart },
    }),
  ]);
  return { quests, total, page, pages: Math.ceil(total / limit) };
};

export const updateQuestProgress = async (
  questId,
  userId,
  progressValue,
  io = null,
) => {
  const quest = await Quest.findOne({ _id: questId, userId, status: "active" });
  if (!quest) throw new AppError("Quest not found or already finished.", 404);

  quest.currentValue = Math.min(progressValue, quest.targetValue);

  if (quest.currentValue >= quest.targetValue) {
    return completeQuest(questId, userId, io);
  }

  await quest.save();
  return { quest, autoCompleted: false };
};

export const completeQuest = async (questId, userId, io = null) => {
  const quest = await Quest.findOneAndUpdate(
    { _id: questId, userId, status: "active" },
    { status: "completed", completedAt: new Date(), currentValue: undefined },
    { new: true },
  );
  if (!quest) throw new AppError("Quest not found or already finished.", 404);

  await Promise.all([
    awardXP(userId, quest.xpReward, io),
    awardStatGains(userId, quest.statRewards),
    Hunter.findOneAndUpdate({ userId }, { $inc: { totalQuestCompletions: 1 } }),
  ]);

  await updateStreakOnQuestComplete(userId, io);
  await checkShadowUnlocks(userId, io);
  await checkBossSpawn(userId, io);
  await checkAndAwardAchievements(userId, io);

  await createNotification(
    userId,
    "questCompleted",
    "QUEST COMPLETE",
    `"${quest.title}" completed. +${quest.xpReward} XP awarded.`,
    { questId: quest._id, xpEarned: quest.xpReward },
    io,
  );

  const { total, completed, allDone } = await getTodaysQuests(userId);
  if (allDone) {
    if (io)
      await emitToUser(io, userId, "system:daily-quests-complete", {
        total,
        completed,
      }, "questUpdates");
    await createNotification(
      userId,
      "systemAlert",
      "🎉 ALL DAILY QUESTS COMPLETE",
      `Outstanding. All ${total} daily quests completed. Your streak is maintained.`,
      { total },
      io,
    );
  }

  return { quest, allDone, total, completed };
};

export const failQuest = async (questId, userId) => {
  const quest = await Quest.findOneAndUpdate(
    { _id: questId, userId, status: "active" },
    { status: "failed", failedAt: new Date() },
    { new: true },
  );
  if (!quest) throw new AppError("Quest not found.", 404);
  return quest;
};
