import Quest from "./quest.model.js";
import Goal from "../goals/goal.model.js";
import Hunter from "../hunter/hunter.model.js";
import User from "../user/user.model.js";
import Stats from "../stats/stats.model.js";
import {
  awardXP,
  awardStatGains,
  updateStreakOnQuestComplete,
  deductXP,
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
import { getZonedDayBounds, getZonedDateKey, normalizeTimeZone } from "../../lib/timeZones.js";
import { recordOpsEvent } from "../../lib/opsMetrics.js";

const DAILY_QUEST_COUNT = 5;

const userDayBounds = async (userId, date = new Date()) => {
  const user = await User.findById(userId).select("timezone").lean();
  return getZonedDayBounds(date, normalizeTimeZone(user?.timezone));
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

const personalizedFallbackQuests = (user, statTargets) => {
  const awakening = user?.awakening || {};
  const goal = awakening.goals?.[0] || "your most important goal";
  const interest = awakening.learningInterests?.[0] || "a skill you want to improve";
  const fitness = awakening.fitnessLevel;
  const available = Number(awakening.availableDailyMinutes) || 60;
  const exerciseMinutes = Math.max(10, Math.min(25, Math.floor(available * 0.25)));

  const learningGoal = `${goal} ${interest}`;
  if (/program|coding|javascript|python|software|web dev/i.test(learningGoal)) {
    const completedLearning = Number(user?.learningQuestCompletions) || 0;
    const phase = Math.min(3, Math.floor(completedLearning / 5));
    const tracks = [
      [
        ["Set up your coding workspace", "Open a browser-based editor or your existing editor. Create a file, run a tiny program, and save the result."],
        ["Learn one programming building block", "Study variables and basic values for 15 minutes, then write three examples in your own code."],
        ["Practice input and output", "Write a tiny program that accepts or uses one value and prints a useful result. Run it twice with different values."],
        ["Trace a short program", "Read a small example line by line. Write down the value of each variable after every step, then run it to check."],
        ["Build a first mini program", "Make a small command-line or browser program that solves one simple problem. Save it and note one improvement."],
      ],
      [
        ["Practice decisions", "Use if/else in a small program that handles at least three different inputs. Run all three cases."],
        ["Practice repetition", "Use a loop to process a short list or repeat an action. Check the output and explain when the loop stops."],
        ["Break a problem into steps", "Write pseudocode for a small feature, then implement and run the first half."],
        ["Debug with evidence", "Run a program with a deliberate mistake, inspect the error, fix it, and record what the message revealed."],
        ["Create a guided mini project", "Combine decisions and repetition in a small useful program. Run three checks and save the working version."],
      ],
      [
        ["Organize code into functions", "Move one repeated action into a function, call it with two inputs, and verify both results."],
        ["Work with a collection of data", "Store several values in a list or array and write code to find or transform one result."],
        ["Read and adapt an example", `Choose a short example related to ${goal}, explain its main parts, then change one behavior and run it.`],
        ["Plan a personal project", `Define one small problem ${goal} could solve, list its inputs and outputs, and split it into three features.`],
        ["Ship your first project slice", "Implement one complete feature from your plan, run at least three checks, and save or share the result."],
      ],
      [
        ["Review a project for quality", "Revisit your project, remove one duplication or confusing section, and confirm its behavior still works."],
        ["Add input validation", "Handle one invalid or unexpected input in your project and test both valid and invalid cases."],
        ["Learn a tool your project needs", "Identify one missing skill for your project, study it briefly, and build a tiny working example."],
        ["Complete a second project feature", "Build the next highest-value feature in your project and check it against your written plan."],
        ["Demo and choose the next level", "Run through your project as a user, write what works and what is missing, then choose the next concrete milestone."],
      ],
    ];
    const tasks = tracks[phase];
    const stepIndex = completedLearning % tasks.length;
    const [title, description] = tasks[stepIndex];
    const mainTarget = statTargets[0];
    const goalQuest = {
      title,
      description,
      purpose: `Training path ${phase + 1}: ${goal}`.slice(0, 300),
      category: mainTarget.category,
      difficulty: phase < 2 ? "E" : phase === 2 ? "D" : "C",
      xpReward: [55, 60, 65, 65, 75][stepIndex],
      targetValue: 1,
      unit: "deliverable",
      statRewards: [{ stat: mainTarget.stat, amount: 3 }],
      targetStat: mainTarget.stat,
      targetStatValue: mainTarget.currentValue,
      targetReason: mainTarget.role,
    };
    return [goalQuest, ...statTargets.slice(1).map((target) =>
      createWeakStatQuest(target, { goal, interest, fitness, exerciseMinutes }),
    )];
  }

  const mainTarget = statTargets[0];
  const goalQuest = {
      title: `Goal Sprint: ${goal}`.slice(0, 120),
      description: `Spend ${Math.min(25, Math.max(15, Math.floor(available * 0.3)))} focused minutes on the smallest useful step toward ${goal}.`,
      purpose: `Build progress toward ${goal}`,
      category: mainTarget.category, difficulty: "D", xpReward: 65, targetValue: 1, unit: "session",
      statRewards: [{ stat: mainTarget.stat, amount: 3 }],
      targetStat: mainTarget.stat,
      targetStatValue: mainTarget.currentValue,
      targetReason: mainTarget.role,
  };
  return [goalQuest, ...statTargets.slice(1).map((target) =>
    createWeakStatQuest(target, { goal, interest, fitness, exerciseMinutes }),
  )];
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

const GOAL_CATEGORY_STAT = { career: "problemSolving" };

const getDailyStatTargets = (user, stats) => {
  const profileCategories = getProfileCategoryPriority(user);
  const awakening = user?.awakening || {};
  const primaryGoalText = normalizeProfileText([
    awakening.goals?.[0],
    awakening.learningInterests?.[0],
    awakening.longTermVision,
  ]);
  const explicitGoalCategory = Object.entries(CATEGORY_KEYWORDS)
    .map(([category, keywords]) => ({
      category,
      score: keywords.reduce((total, keyword) => total + (primaryGoalText.includes(keyword) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];
  const prioritizedCategories = explicitGoalCategory?.score > 0
    ? [explicitGoalCategory.category, ...profileCategories]
    : profileCategories;
  const primaryStat = prioritizedCategories
    .map((category) => CATEGORY_DEFAULT_STAT[category] || GOAL_CATEGORY_STAT[category])
    .find((stat) => LIFE_STATS.includes(stat)) || "intelligence";
  const values = Object.fromEntries(LIFE_STATS.map((stat) => [
    stat,
    Number.isFinite(Number(stats?.[stat]?.value)) ? Number(stats[stat].value) : 10,
  ]));
  const dayNumber = Math.floor(Date.now() / 86400000);
  const tieStart = dayNumber % LIFE_STATS.length;
  const tieOrder = (stat) => (LIFE_STATS.indexOf(stat) - tieStart + LIFE_STATS.length) % LIFE_STATS.length;
  const weakest = [...LIFE_STATS].sort((a, b) => values[a] - values[b] || tieOrder(a) - tieOrder(b));
  const orderedStats = [primaryStat, ...weakest.filter((stat) => stat !== primaryStat)].slice(0, DAILY_QUEST_COUNT);

  return orderedStats.map((stat, index) => ({
    stat,
    currentValue: values[stat],
    category: STAT_TO_CATEGORY[stat] || CATEGORY_DEFAULT_STAT[stat] || "productivity",
    role: index === 0 ? "main goal" : "lowest stat",
  }));
};

const createWeakStatQuest = (target, { goal, interest, fitness, exerciseMinutes }) => {
  const byStat = {
    strength: ["Strength Builder", "Do a short bodyweight strength set at a level that feels comfortable. Log what you completed."],
    agility: ["Quick Execution Sprint", "Choose one small task toward your goal, work on it without switching, and record the result."],
    intelligence: [`Skill Practice: ${interest}`, `Study or practice ${interest} for 15 minutes, then write one example or idea in your own words.`],
    vitality: [fitness === "sedentary" ? "Movement Reset" : "Vitality Session", fitness === "sedentary" ? `Take a gentle ${exerciseMinutes}-minute walk or movement break.` : `Do ${exerciseMinutes} minutes of comfortable movement and note how you feel.`],
    sense: ["Focused Work Block", `Work on one clearly defined next step for ${goal} for 20 minutes with distractions silenced.`],
    discipline: ["Keep One Small Promise", `Choose one 10-minute action that supports ${goal}, complete it at the time you chose, and mark it done.`],
    communication: ["Explain It Clearly", `Write or say a short explanation of one idea related to ${goal}, then make it clearer in one revision.`],
    leadership: ["Take Initiative", `Identify one small useful next step for ${goal}, write who or what it helps, and complete the part within your control.`],
    creativity: ["Create a Small Draft", `Make one rough sketch, outline, prototype, or written draft related to ${goal}. Keep it small and save it.`],
    financialIntelligence: ["Money Awareness Check", "Record today's spending or review one recent expense, then identify one practical choice for next time."],
    problemSolving: ["Solve One Blocker", `Name one obstacle slowing ${goal}, list two possible fixes, and try the simplest safe one.`],
    emotionalControl: ["Reset and Reflect", "Take a quiet five-minute pause, then write what is on your mind and one next action you can control."],
    timeManagement: ["Plan the Next Block", `Choose the next task for ${goal}, estimate its time, and reserve a realistic slot for it today.`],
  };
  const [title, description] = byStat[target.stat] || byStat.problemSolving;
  const targetValue = target.stat === "vitality" ? exerciseMinutes : 1;
  const unit = target.stat === "vitality" ? "minutes" : "task";
  return {
    title,
    description,
    purpose: `Strengthen ${target.stat} (current value ${target.currentValue}) while supporting ${goal}.`,
    category: target.category,
    difficulty: target.currentValue < 20 ? "E" : "D",
    xpReward: 50,
    targetValue,
    unit,
    statRewards: [{ stat: target.stat, amount: 3 }],
      targetStat: target.stat,
      targetStatValue: target.currentValue,
      targetReason: target.role,
  };
};

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

const createAIQuestsForUser = async ({ userId, user, hunter, stats, statTargets, startingSlot, slotsNeeded }) => {
  const { end: localEnd } = getZonedDayBounds(new Date(), normalizeTimeZone(user?.timezone));
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
    completedRelevantQuests: user.learningQuestHistory || [],
    dailyStatTargets: statTargets,
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
      currentDate: getZonedDateKey(new Date(), normalizeTimeZone(user?.timezone)),
      statTargets,
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

  valid.forEach((quest, index) => {
    const target = statTargets[index];
    quest.category = target.category;
    quest.stat = target.stat;
    quest.targetStat = target.stat;
    quest.targetStatValue = target.currentValue;
    quest.targetReason = target.role;
    quest.purpose = `${quest.purpose} Builds ${target.stat} (current value ${target.currentValue}).`;
  });

  const created = [];
  for (const q of valid.slice(startingSlot, startingSlot + slotsNeeded)) {
    created.push(await Quest.create({
      userId,
      title: q.title,
      description: q.description,
      purpose: q.purpose,
      category: q.category,
      difficulty: q.difficulty,
      xpReward: q.xpReward,
      statRewards: [{ stat: q.stat, amount: q.statAmount }],
      targetStat: q.targetStat,
      targetStatValue: q.targetStatValue,
      targetReason: q.targetReason,
      expectedOutcome: q.expectedOutcome,
      generatedReason: "Personalized from your Awakening profile",
      targetValue: q.targetValue,
      unit: q.unit,
      evolutionLevel: 1,
      dueAt: localEnd,
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

/**
 * Generate exactly DAILY_QUEST_COUNT quests for today.
 * Uses local time (not UTC) to avoid timezone boundary issues.
 * Uses cloud AI as the primary generator and a profile-aware local backup if AI is unavailable.
 */
const generateQuestsForUserUnlocked = async (userId, io = null) => {
  const { start: todayStart, end: todayEnd } = await userDayBounds(userId);

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
    User.findById(userId).select("awakening timezone"),
  ]);

  if (!hunter) {
    console.warn(`[QUEST] Hunter not found for user ${userId}`);
    return [];
  }

  if (user?.awakening) {
    const relevantLearningFilter = {
      userId,
      status: "completed",
      $or: [{ category: "learning" }, { purpose: /^Training path/ }],
    };
    const relevant = await Quest.find(relevantLearningFilter)
      .sort({ completedAt: -1 }).limit(8).select("title expectedOutcome").lean();
    user.learningQuestCompletions = await Quest.countDocuments(relevantLearningFilter);
    user.learningQuestHistory = relevant.map(({ title, expectedOutcome }) => ({ title, outcome: expectedOutcome }));
  }
  const statTargets = getDailyStatTargets(user, stats);

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
        statTargets,
        startingSlot: todaysQuestCount,
        slotsNeeded,
      });
      console.log(`[QUEST] Generated ${newQuests.length} AI-personalized quests for user ${userId}`);
    } catch (error) {
      aiGenerationFailed = true;
      recordOpsEvent("ai", "daily_quest_generation_fallback", "fallback", error);
      console.error(`[QUEST] AI daily quest generation failed for user ${userId}:`, error.message);
    }
  } else {
    recordOpsEvent("ai", "daily_quest_ai_not_configured_fallback", "fallback");
  }

  // Safe local backup. This is only reached when AI is not configured or the
  // provider returns an invalid response/error.
  if (newQuests.length === 0) {
    const personalized = personalizedFallbackQuests(user, statTargets);
    const toCreate = personalized.slice(
      todaysQuestCount,
      todaysQuestCount + slotsNeeded,
    );

    for (const q of toCreate) {
      const quest = await Quest.create({
        userId,
        title: q.title,
        description: q.description,
        purpose: q.purpose || `Build your ${q.category} skill`,
        category: q.category,
        difficulty: q.difficulty,
        xpReward: q.xpReward,
        statRewards: q.statRewards,
        targetStat: q.targetStat,
        targetStatValue: q.targetStatValue,
        targetReason: q.targetReason,
        targetValue: q.targetValue,
        unit: q.unit,
        generatedReason: aiGenerationFailed
          ? "Personalized local backup because AI was temporarily unavailable"
          : "Personalized daily assignment",
        evolutionLevel: 1,
        dueAt: todayEnd,
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

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Mongo's atomic per-user lease coordinates API requests and cron workers across
// processes. The lease expires so a crashed worker cannot block future plans.
export const generateQuestsForUser = async (userId, io = null) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const now = new Date();
    const lockUntil = new Date(now.getTime() + 10 * 60 * 1000);
    const lock = await User.findOneAndUpdate(
      {
        _id: userId,
        $or: [
          { dailyQuestGenerationLockUntil: null },
          { dailyQuestGenerationLockUntil: { $lte: now } },
        ],
      },
      { $set: { dailyQuestGenerationLockUntil: lockUntil } },
      { new: true },
    ).select("_id").lean();

    if (lock) {
      try {
        return await generateQuestsForUserUnlocked(userId, io);
      } finally {
        try {
          await User.updateOne(
            { _id: userId, dailyQuestGenerationLockUntil: lockUntil },
            { $set: { dailyQuestGenerationLockUntil: null } },
          );
        } catch (error) {
          console.error(`[QUEST] Could not release generation lease for ${userId}: ${error.message}`);
        }
      }
    }

    const user = await User.findById(userId).select("dailyQuestGenerationLockUntil").lean();
    if (!user) return [];
    if (!user.dailyQuestGenerationLockUntil || user.dailyQuestGenerationLockUntil <= now) continue;
    await wait(250);
  }

  console.warn(`[QUEST] Daily generation is already running for user ${userId}; leaving the existing run in control.`);
  return [];
};

/**
 * Get today's quests (local time).
 * Auto-generates if none exist yet for today.
 */
export const getTodaysQuests = async (userId, io = null) => {
  const { start: todayStart, end: todayEnd } = await userDayBounds(userId);

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
  const { start: todayStart } = await userDayBounds(userId);
  const skip = (page - 1) * limit;
  const [quests, total] = await Promise.all([
    Quest.find({
      userId,
      status: { $in: ["completed", "failed", "expired", "recovered"] },
      createdAt: { $lt: todayStart },
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Quest.countDocuments({
      userId,
      status: { $in: ["completed", "failed", "expired", "recovered"] },
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

const syncGoalProgressFromQuest = async (quest, userId) => {
  if (!quest.goalId || !quest.goalQuestId) return null;

  const goal = await Goal.findOne({ _id: quest.goalId, userId }).lean();
  if (!goal) return null;

  const linkedQuests = await Quest.find({
    userId,
    goalId: goal._id,
  }).select("goalQuestId status").lean();

  const completedIds = new Set(
    linkedQuests
      .filter((item) => item.status === "completed")
      .map((item) => String(item.goalQuestId)),
  );

  const allGoalQuests = (goal.milestones || []).flatMap((milestone) => milestone.quests || []);
  const total = allGoalQuests.length;
  const completed = allGoalQuests.filter((item) => completedIds.has(String(item._id))).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const goalCompleted = total > 0 && completed === total;

  let previousCompleted = true;
  const milestones = (goal.milestones || []).map((milestone) => {
    const quests = milestone.quests || [];
    const milestoneCompleted = quests.length > 0 && quests.every((item) => completedIds.has(String(item._id)));
    const status = milestoneCompleted
      ? "completed"
      : previousCompleted
        ? "active"
        : "locked";

    previousCompleted = milestoneCompleted;

    return {
      _id: milestone._id,
      status,
    };
  });

  await Goal.updateOne(
    { _id: goal._id, userId },
    {
      $set: {
        progress,
        // Quest progress must not resume a goal the user explicitly paused.
        status: goalCompleted
          ? "completed"
          : goal.status === "paused"
            ? "paused"
            : "active",
      },
    },
  );

  // Persist milestone statuses individually so the Goals page can render them directly.
  await Promise.all(
    milestones.map((milestone) =>
      Goal.updateOne(
        { _id: goal._id, userId, "milestones._id": milestone._id },
        { $set: { "milestones.$.status": milestone.status } },
      ),
    ),
  );

  return { progress, completed, total, goalCompleted };
};

export const completeQuest = async (questId, userId, io = null) => {
  const quest = await Quest.findOneAndUpdate(
    { _id: questId, userId, status: "active" },
    { status: "completed", completedAt: new Date(), currentValue: undefined },
    { new: true },
  );
  if (!quest) throw new AppError("Quest not found or already finished.", 404);

  const [xpResult] = await Promise.all([
    awardXP(userId, quest.xpReward, io),
    awardStatGains(userId, quest.statRewards),
    Hunter.findOneAndUpdate({ userId }, { $inc: { totalQuestCompletions: 1 } }),
  ]);
  quest.earnedXP = xpResult.xpEarned;
  await quest.save();

  const streakUpdate = await updateStreakOnQuestComplete(userId, io);
  if (streakUpdate?.returnedAfterBreak) {
    const comebackAward = await awardXP(userId, 25, io);
    await createNotification(
      userId,
      "streakMilestone",
      `WELCOME BACK — +${comebackAward.xpEarned} XP`,
      "You completed today's quests and started a fresh streak. Showing up again earned you a return bonus.",
      { streak: streakUpdate.hunter.currentStreak, xpEarned: comebackAward.xpEarned, comeback: true },
      io,
    );
  }
  const goalProgress = await syncGoalProgressFromQuest(quest, userId);
  await checkShadowUnlocks(userId, io);
  await checkBossSpawn(userId, io);
  await checkAndAwardAchievements(userId, io);

  await createNotification(
    userId,
    "questCompleted",
    "QUEST COMPLETE",
    `"${quest.title}" completed. +${xpResult.xpEarned} XP awarded.`,
    { questId: quest._id, xpEarned: xpResult.xpEarned },
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

  return { quest, allDone, total, completed, goalProgress };
};

export const failQuest = async (questId, userId, io = null) => {
  const existing = await Quest.findOne({ _id: questId, userId, status: "active" }).select("xpReward").lean();
  if (!existing) throw new AppError("Quest not found.", 404);
  const penalty = calculateMissedQuestPenalty(existing.xpReward);
  const quest = await Quest.findOneAndUpdate(
    { _id: questId, userId, status: "active" },
    { $set: { status: "failed", failedAt: new Date(), xpPenalty: penalty } },
    { new: true },
  );
  if (!quest) throw new AppError("Quest not found.", 404);
  const deducted = await deductXP(userId, penalty, io);
  quest.xpPenalty = deducted || 0;
  await quest.save();
  await createNotification(
    userId,
    "questFailed",
    "QUEST FAILED",
    `"${quest.title}" was marked as failed. ${deducted || 0} XP was deducted.`,
    { questId: quest._id, xpPenalty: deducted || 0 },
    io,
  );
  return quest;
};

export const recoverExpiredQuest = async (missedQuestId, userId, replaceQuestId, io = null) => {
  if (!replaceQuestId || String(missedQuestId) === String(replaceQuestId)) {
    throw new AppError("Choose a different active quest to replace.", 400);
  }

  const { start: todayStart, end: todayEnd } = await userDayBounds(userId);
  const missedQuest = await Quest.findOne({ _id: missedQuestId, userId, status: "expired" });
  if (!missedQuest) throw new AppError("This missed quest is no longer available to recover.", 404);

  const replacement = await Quest.findOne({
    _id: replaceQuestId,
    userId,
    status: "active",
    createdAt: { $gte: todayStart, $lte: todayEnd },
    $or: [
      { recoveryHistory: { $size: 0 } },
      { recoveryHistory: { $exists: false } },
    ],
  });
  if (!replacement) {
    throw new AppError("Choose an unused active quest from today's plan to replace.", 409);
  }

  const recoveredAt = new Date();
  const claimedMissedQuest = await Quest.findOneAndUpdate(
    { _id: missedQuest._id, userId, status: "expired" },
    { $set: { status: "recovered", recoveredAt } },
    { new: true },
  );
  if (!claimedMissedQuest) throw new AppError("This missed quest has already been recovered.", 409);

  const replacementFields = {
    title: missedQuest.title,
    description: missedQuest.description,
    purpose: missedQuest.purpose,
    category: missedQuest.category,
    difficulty: missedQuest.difficulty,
    xpReward: missedQuest.xpReward,
    earnedXP: 0,
    xpPenalty: 0,
    statRewards: missedQuest.statRewards,
    targetStat: missedQuest.targetStat,
    targetStatValue: missedQuest.targetStatValue,
    targetReason: missedQuest.targetReason,
    expectedOutcome: missedQuest.expectedOutcome,
    generatedReason: `Recovered missed quest; ${replacement.title} was moved aside`,
    goalId: missedQuest.goalId,
    goalQuestId: missedQuest.goalQuestId,
    targetValue: missedQuest.targetValue,
    currentValue: missedQuest.currentValue,
    unit: missedQuest.unit,
    dueAt: todayEnd,
    completedAt: null,
    failedAt: null,
    status: "active",
    isSystemGenerated: true,
  };

  const recoveredQuest = await Quest.findOneAndUpdate(
    {
      _id: replacement._id,
      userId,
      status: "active",
      createdAt: { $gte: todayStart, $lte: todayEnd },
      $or: [
        { recoveryHistory: { $size: 0 } },
        { recoveryHistory: { $exists: false } },
      ],
    },
    {
      $set: replacementFields,
      $push: {
        recoveryHistory: {
          replacedTitle: replacement.title,
          replacedDescription: replacement.description,
          replacedCategory: replacement.category,
          replacedTargetValue: replacement.targetValue,
          replacedCurrentValue: replacement.currentValue,
          replacedUnit: replacement.unit,
          replacedAt: recoveredAt,
        },
      },
    },
    { new: true, runValidators: true },
  );

  if (!recoveredQuest) {
    await Quest.updateOne(
      { _id: claimedMissedQuest._id, userId, status: "recovered", recoveredAt },
      { $set: { status: "expired", recoveredAt: null } },
    );
    throw new AppError("Today's active plan changed. Refresh and choose another quest.", 409);
  }

  await createNotification(
    userId,
    "questAssigned",
    "QUEST RECOVERED",
    `"${missedQuest.title}" was added to today's plan in place of "${replacement.title}". Its earlier XP deduction remains.`,
    { questId: recoveredQuest._id, recoveredQuestId: missedQuest._id, replacedQuestTitle: replacement.title },
    io,
  );

  return { quest: recoveredQuest, replacedQuestTitle: replacement.title, xpPenalty: missedQuest.xpPenalty || 0 };
};

const calculateMissedQuestPenalty = (xpReward) =>
  clamp(Math.round(Number(xpReward || 0) * (0.1 + Math.random() * 0.15)), 5, 25);

// Expire each missed quest once and apply a small, task-scaled XP consequence.
// The penalty is 10–25% of that quest's reward, with a 5–25 XP cap.
export const expireMissedQuests = async (userId, io = null, now = new Date()) => {
  const { start: todayStart } = await userDayBounds(userId, now);
  const missed = await Quest.find({ userId, status: "active", dueAt: { $lt: todayStart } });
  let expiredCount = 0;
  for (const quest of missed) {
    const penalty = calculateMissedQuestPenalty(quest.xpReward);
    const expired = await Quest.findOneAndUpdate(
      { _id: quest._id, status: "active" },
      { $set: { status: "expired", failedAt: new Date(), xpPenalty: penalty } },
      { new: true },
    );
    if (!expired) continue;
    const deducted = await deductXP(quest.userId, penalty, io);
    expired.xpPenalty = deducted || 0;
    await expired.save();
    expiredCount += 1;
    await createNotification(
      quest.userId,
      "systemWarning",
      "QUEST MISSED",
      `"${quest.title}" expired. ${deducted || 0} XP was deducted. Start today's plan with a manageable step.`,
      { questId: quest._id, xpPenalty: deducted || 0 },
      io,
    );
  }
  return { expiredCount };
};
