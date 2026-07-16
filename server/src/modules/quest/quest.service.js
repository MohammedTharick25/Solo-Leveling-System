import Quest from "./quest.model.js";
import QuestTemplate from "./questTemplate.model.js";
import Hunter from "../hunter/hunter.model.js";
import Stats from "../stats/stats.model.js";
import {
  awardXP,
  awardStatGains,
  updateStreakOnQuestComplete,
} from "../hunter/hunter.service.js";
import { checkShadowUnlocks } from "../shadow/shadow.service.js";
import { checkBossSpawn } from "../boss/boss.service.js";
import { createNotification } from "../notification/notification.service.js";
import { questXPReward } from "../../lib/xpFormulas.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { checkAndAwardAchievements } from "../achievements/achievement.service.js";

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
 * Auto-falls back to hardcoded quests if no templates seeded.
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

  const [stats, hunter] = await Promise.all([
    Stats.findOne({ userId }),
    Hunter.findOne({ userId }),
  ]);

  if (!hunter) {
    console.warn(`[QUEST] Hunter not found for user ${userId}`);
    return [];
  }

  // Check if any templates exist
  const templateCount = await QuestTemplate.countDocuments({ isActive: true });

  let newQuests = [];

  if (templateCount === 0) {
    // ── Fallback: use hardcoded quests ───────────────────────────────────
    console.warn("[QUEST] No templates found, using fallback quests");
    const toCreate = FALLBACK_QUESTS.slice(
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
        generatedReason: "Daily system assignment",
        evolutionLevel: 1,
        dueAt: localEndOfDay(),
        isSystemGenerated: true,
      });
      newQuests.push(quest);
    }
  } else {
    // ── Normal: use templates, targeting weak stats ──────────────────────
    const statScores = stats
      ? LIFE_STATS.map((name) => ({
          name,
          value: stats[name]?.value ?? 0,
          category: STAT_TO_CATEGORY[name],
        })).sort((a, b) => a.value - b.value)
      : LIFE_STATS.map((name) => ({
          name,
          value: 0,
          category: STAT_TO_CATEGORY[name],
        }));

    // Deduplicate categories
    const seenCategories = new Set();
    const targets = [];
    for (const s of statScores) {
      if (!seenCategories.has(s.category)) {
        seenCategories.add(s.category);
        targets.push(s);
      }
      if (targets.length >= slotsNeeded) break;
    }

    // Fill remaining slots if not enough unique categories
    if (targets.length < slotsNeeded) {
      for (const s of statScores) {
        if (targets.length >= slotsNeeded) break;
        if (!targets.find((t) => t.name === s.name)) targets.push(s);
      }
    }

    for (const targetStat of targets.slice(0, slotsNeeded)) {
      // Try to find a template for this category
      let templates = await QuestTemplate.find({
        category: targetStat.category,
        isActive: true,
      });

      // If no template for this category, get any template
      if (!templates.length) {
        templates = await QuestTemplate.find({ isActive: true }).limit(10);
      }
      if (!templates.length) continue;

      const template = templates[Math.floor(Math.random() * templates.length)];
      const maxStage = template.evolutionStages?.length || 1;
      const evolutionLevel = Math.min(
        Math.max(1, Math.ceil((hunter.level || 1) / 10)),
        maxStage,
      );
      const stage = template.evolutionStages?.[evolutionLevel - 1];

      if (!stage) continue;

      const xpReward = questXPReward(
        stage.xpReward || 50,
        hunter.level || 1,
        stage.difficulty || template.baseDifficulty || "D",
      );

      const quest = await Quest.create({
        userId,
        templateId: template._id,
        title: stage.title,
        description: stage.description,
        purpose: `Strengthen your ${targetStat.name} — currently ${targetStat.value}/100`,
        category: targetStat.category,
        difficulty: stage.difficulty || template.baseDifficulty || "D",
        xpReward,
        statRewards: template.statRewards?.length
          ? template.statRewards
          : [{ stat: targetStat.name, amount: 3 }],
        expectedOutcome: template.expectedOutcome || stage.description,
        generatedReason: `${targetStat.name} is at ${targetStat.value}/100`,
        targetValue: stage.targetValue || 1,
        unit: stage.unit || "",
        evolutionLevel,
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
      io.to(`user:${userId}`).emit("system:quest-assigned", {
        count: newQuests.length,
      });
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

  // Auto-generate if nothing exists yet
  if (quests.length === 0) {
    console.log(
      `[QUEST] No quests found for user ${userId} today — auto-generating`,
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
      io.to(`user:${userId}`).emit("system:daily-quests-complete", {
        total,
        completed,
      });
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
