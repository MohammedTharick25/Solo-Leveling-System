import Hunter from "../hunter/hunter.model.js";
import User from "../user/user.model.js";
import Stats from "../stats/stats.model.js";
import Quest from "../quest/quest.model.js";
import Habit from "../habits/habit.model.js";
import Journal from "../journal/journal.model.js";
import FocusSession from "../focusSession/focusSession.model.js";
import Analytics from "../analytics/analytics.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { generateJSON, generateText, isCloudAIConfigured } from "../../lib/ai/ai.service.js";
import { buildGoalBreakdownPrompt, buildNextActionPrompt } from "../../lib/ai/ai.prompts.js";

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const compactQuest = (quest) => ({
  title: quest.title,
  category: quest.category,
  difficulty: quest.difficulty,
  status: quest.status,
  progress: quest.progress,
  xpReward: quest.xpReward,
  dueAt: quest.dueAt,
});

const compactJournal = (entry) => ({
  date: entry.date,
  mood: entry.mood,
  energyLevel: entry.energyLevel,
  wins: (entry.wins || []).slice(0, 4),
  failures: (entry.failures || []).slice(0, 4),
  lessons: (entry.lessons || []).slice(0, 4),
  challenges: (entry.challenges || []).slice(0, 4),
  tomorrowPlan: entry.tomorrowPlan,
  freeText: entry.freeText?.slice(0, 500),
});

export const getHunterContext = async (userId) => {
  const [user, hunter, stats, quests, habits, journals, focusSessions, analytics] =
    await Promise.all([
      User.findById(userId).select("hunterName timezone country awakening bio"),
      Hunter.findOne({ userId }),
      Stats.findOne({ userId }),
      Quest.find({ userId }).sort({ dueAt: 1, createdAt: -1 }).limit(12),
      Habit.find({ userId, isActive: true }).sort({ currentStreak: -1 }).limit(12),
      Journal.find({ userId, date: { $gte: daysAgo(7) } }).sort({ date: -1 }).limit(7),
      FocusSession.find({ userId, startedAt: { $gte: daysAgo(7) } })
        .sort({ startedAt: -1 })
        .limit(20),
      Analytics.find({ userId, date: { $gte: daysAgo(7) } }).sort({ date: 1 }).limit(14),
    ]);

  if (!user || !hunter) throw new AppError("Hunter profile not found.", 404);

  const completedQuests = quests.filter((q) => q.status === "completed").length;
  const totalFocusMinutes = focusSessions.reduce(
    (sum, session) => sum + (session.actualDuration || 0),
    0,
  );

  return {
    hunter: {
      name: hunter.hunterName || user.hunterName,
      level: hunter.level,
      rank: hunter.rank,
      title: hunter.title,
      xp: hunter.xp,
      totalXP: hunter.totalXP,
      currentStreak: hunter.currentStreak,
      longestStreak: hunter.longestStreak,
      powerScore: hunter.powerScore,
      consistencyRating: hunter.consistencyRating,
      growthRating: hunter.growthRating,
    },
    profile: {
      timezone: user.timezone,
      country: user.country,
      bio: user.bio,
      age: user.awakening?.age || null,
      occupation: user.awakening?.occupation || "",
      isStudent: user.awakening?.isStudent ?? null,
      fitnessLevel: user.awakening?.fitnessLevel || "",
      dailySchedule: user.awakening?.dailySchedule || {},
      goals: user.awakening?.goals || [],
      longTermVision: user.awakening?.longTermVision || "",
      learningInterests: user.awakening?.learningInterests || [],
      availableDailyMinutes: user.awakening?.availableDailyMinutes || null,
      biggestWeaknesses: user.awakening?.biggestWeaknesses || [],
      biggestStrengths: user.awakening?.biggestStrengths || [],
    },
    stats: stats
      ? {
          focusScore: stats.focusScore,
          disciplineScore: stats.disciplineScore,
          learningScore: stats.learningScore,
          healthScore: stats.healthScore,
          momentumScore: stats.momentumScore,
          energyScore: stats.energyScore,
          consistencyScore: stats.consistencyScore,
          performanceScore: stats.performanceScore,
        }
      : {},
    quests: quests.map(compactQuest),
    questSummary: {
      returned: quests.length,
      completed: completedQuests,
      open: quests.filter((q) => q.status !== "completed" && q.status !== "failed").length,
      failed: quests.filter((q) => q.status === "failed").length,
    },
    habits: habits.map((habit) => ({
      name: habit.name,
      category: habit.category,
      frequency: habit.frequency,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak,
      totalCompletions: habit.totalCompletions,
    })),
    journal: journals.map(compactJournal),
    focus: {
      last7DaysMinutes: totalFocusMinutes,
      sessions: focusSessions.map((session) => ({
        type: session.type,
        plannedDuration: session.plannedDuration,
        actualDuration: session.actualDuration,
        completed: session.completed,
        focusScore: session.focusScore,
        startedAt: session.startedAt,
        notes: session.notes?.slice(0, 300),
      })),
    },
    analytics: analytics.map((item) => ({
      date: item.date,
      xpEarned: item.xpEarned,
      questsCompleted: item.questsCompleted,
      questsFailed: item.questsFailed,
      focusMinutes: item.focusMinutes,
      moodScore: item.moodScore,
      energyScore: item.energyScore,
      productivityScore: item.productivityScore,
      streakDay: item.streakDay,
    })),
  };
};

const localNextAction = (context) => {
  const openQuest = context.quests.find(
    (quest) => quest.status !== "completed" && quest.status !== "failed",
  );

  if (openQuest) {
    return {
      title: openQuest.title,
      reason: "You already have an active quest. Finish one clear mission before adding more work.",
      durationMinutes: openQuest.difficulty === "hard" ? 45 : 30,
      category: openQuest.category || "discipline",
      xpEstimate: openQuest.xpReward || 25,
      source: "local",
    };
  }

  const focusScore = context.stats?.focusScore || 0;
  return {
    title: focusScore < 50 ? "Start a 25-minute focus session" : "Review tomorrow's top priority",
    reason:
      focusScore < 50
        ? "Your current focus score leaves room for a short, distraction-free session."
        : "You have no urgent quest detected, so prepare the next mission before the day ends.",
    durationMinutes: 25,
    category: "focus",
    xpEstimate: 30,
    source: "local",
  };
};

export const chat = async ({ userId, question }) => {
  const context = await getHunterContext(userId);
  const answer = await generateText({ question, context });

  if (answer) {
    return { answer, provider: "groq", context: { level: context.hunter.level, streak: context.hunter.currentStreak } };
  }

  return {
    answer: `The System is running in local coach mode because no cloud AI key is configured. Start with: ${localNextAction(context).title}.`,
    provider: "local",
    context: { level: context.hunter.level, streak: context.hunter.currentStreak },
  };
};

export const nextAction = async (userId) => {
  const context = await getHunterContext(userId);
  if (!isCloudAIConfigured()) return localNextAction(context);

  const result = await generateJSON({ prompt: buildNextActionPrompt(context) });
  if (!result?.title) return localNextAction(context);

  return { ...result, source: "groq" };
};

export const breakdownGoal = async ({ userId, goal }) => {
  if (!goal?.trim()) throw new AppError("Goal is required.", 400);

  const context = await getHunterContext(userId);
  if (!isCloudAIConfigured()) {
    return {
      goal: goal.trim(),
      whyItMatters: "Turn the goal into smaller missions you can complete consistently.",
      milestones: [
        {
          title: "Define the first milestone",
          description: "Choose one measurable result that proves you are moving forward.",
          quests: ["Write the milestone", "Choose the next 30-minute action"],
        },
      ],
      firstQuest: `Spend 15 minutes defining the first concrete result for: ${goal.trim()}`,
      source: "local",
    };
  }

  const result = await generateJSON({
    prompt: buildGoalBreakdownPrompt({ goal: goal.trim(), context }),
  });

  if (!result?.milestones) throw new AppError("The AI could not build the goal plan. Try again.", 502);
  return { ...result, source: "groq" };
};
