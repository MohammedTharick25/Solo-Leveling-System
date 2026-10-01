import Goal from "./goal.model.js";
import Quest from "../quest/quest.model.js";
import Hunter from "../hunter/hunter.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { breakdownGoal } from "../ai/ai.service.js";

const CATEGORY_TO_STAT = {
  learning: "intelligence",
  health: "vitality",
  fitness: "strength",
  career: "intelligence",
  finance: "financialIntelligence",
  personal: "discipline",
  productivity: "productivity",
  other: "discipline",
};

const normalizeCategory = (category) =>
  ["learning", "health", "career", "finance", "personal", "fitness", "productivity", "other"].includes(category)
    ? category
    : "personal";

export const listGoals = async (userId) => {
  const goals = await Goal.find({ userId }).sort({ status: 1, createdAt: -1 }).lean();
  if (!goals.length) return [];

  const goalIds = goals.map((goal) => goal._id);
  const linkedQuests = await Quest.find({ userId, goalId: { $in: goalIds } })
    .select("goalId goalQuestId status completedAt failedAt")
    .lean();

  const questMap = new Map(
    linkedQuests.map((quest) => [String(quest.goalQuestId), quest]),
  );

  return goals.map((goal) => {
    let totalGoalQuests = 0;
    let completedGoalQuests = 0;

    const milestones = (goal.milestones || []).map((milestone) => {
      let milestoneCompleted = 0;
      const quests = (milestone.quests || []).map((goalQuest) => {
        totalGoalQuests += 1;
        const linked = questMap.get(String(goalQuest._id));
        const runtimeStatus = linked?.status || "not_added";

        if (runtimeStatus === "completed") completedGoalQuests += 1;
        if (runtimeStatus === "completed") milestoneCompleted += 1;

        return {
          ...goalQuest,
          runtimeStatus,
          completedAt: linked?.completedAt || null,
          failedAt: linked?.failedAt || null,
          linkedQuestId: linked?._id || null,
        };
      });

      const milestoneTotal = quests.length;
      const milestoneProgress = milestoneTotal
        ? Math.round((milestoneCompleted / milestoneTotal) * 100)
        : 0;
      return {
        ...milestone,
        quests,
        progress: milestoneProgress,
        completedQuestCount: milestoneCompleted,
        totalQuestCount: milestoneTotal,
        // Status is assigned in a second pass below so milestone N can unlock
        // immediately when milestone N-1 is completed.
        status: milestone.status,
      };
    });

    // Milestones are sequential: the first is available, and each later
    // milestone unlocks only after the previous milestone is completed.
    // Do not trust a stale persisted "locked" value here because older goal
    // records may still contain the original locked status.
    let previousCompleted = true;
    const resolvedMilestones = milestones.map((milestone) => {
      const completed = milestone.totalQuestCount > 0
        && milestone.completedQuestCount === milestone.totalQuestCount;

      const status = completed
        ? "completed"
        : previousCompleted
          ? "active"
          : "locked";

      previousCompleted = completed;

      return { ...milestone, status };
    });

    const missionProgress = totalGoalQuests
      ? Math.round((completedGoalQuests / totalGoalQuests) * 100)
      : 0;

    return {
      ...goal,
      milestones: resolvedMilestones,
      totalGoalQuests,
      completedGoalQuests,
      missionProgress,
      allGoalQuestsCompleted: totalGoalQuests > 0 && completedGoalQuests === totalGoalQuests,
    };
  });
};

export const createGoal = async (userId, data) => {
  const title = String(data.title || "").trim();
  if (!title) throw new AppError("Goal title is required.", 400);

  return Goal.create({
    userId,
    title,
    description: String(data.description || "").trim(),
    category: normalizeCategory(data.category),
    targetDate: data.targetDate ? new Date(data.targetDate) : null,
  });
};

export const updateGoal = async (goalId, userId, data) => {
  const allowed = {};
  if (data.title !== undefined) allowed.title = String(data.title).trim();
  if (data.description !== undefined) allowed.description = String(data.description).trim();
  if (data.category !== undefined) allowed.category = normalizeCategory(data.category);
  if (data.targetDate !== undefined) allowed.targetDate = data.targetDate ? new Date(data.targetDate) : null;
  if (data.status !== undefined && ["active", "completed", "paused"].includes(data.status)) allowed.status = data.status;
  if (data.progress !== undefined) allowed.progress = Math.max(0, Math.min(100, Number(data.progress) || 0));

  const goal = await Goal.findOneAndUpdate({ _id: goalId, userId }, allowed, { new: true, runValidators: true });
  if (!goal) throw new AppError("Goal not found.", 404);
  return goal;
};

export const deleteGoal = async (goalId, userId) => {
  const goal = await Goal.findOneAndDelete({ _id: goalId, userId });
  if (!goal) throw new AppError("Goal not found.", 404);
  await Quest.updateMany({ userId, goalId }, { $unset: { goalId: "" } });
  return goal;
};

export const planGoal = async (goalId, userId) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw new AppError("Goal not found.", 404);

  const plan = await breakdownGoal({ userId, goal: goal.title });
  const milestones = (plan.milestones || []).slice(0, 5).map((milestone, index) => ({
    title: String(milestone.title || `Milestone ${index + 1}`).trim(),
    description: String(milestone.description || "").trim(),
    order: index + 1,
    status: index === 0 ? "active" : "locked",
    quests: (milestone.quests || []).slice(0, 4).map((quest) => {
      if (typeof quest === "string") {
        return {
          title: quest.trim(),
          description: "Complete this small step toward the milestone.",
          category: "productivity",
          difficulty: "D",
          xpReward: 30,
          targetValue: 1,
          unit: "task",
        };
      }
      return {
        title: String(quest.title || "Next step").trim(),
        description: String(quest.description || "").trim(),
        category: quest.category || "productivity",
        difficulty: ["F", "E", "D", "C", "B", "A", "S"].includes(quest.difficulty) ? quest.difficulty : "D",
        xpReward: Math.max(10, Math.min(250, Number(quest.xpReward) || 30)),
        targetValue: Math.max(1, Number(quest.targetValue) || 1),
        unit: String(quest.unit || "task").slice(0, 40),
      };
    }),
  }));

  goal.whyItMatters = String(plan.whyItMatters || "Break the goal into small actions you can complete consistently.");
  goal.milestones = milestones;
  goal.aiGenerated = true;
  await goal.save();
  return goal;
};

export const addQuestFromGoal = async (goalId, userId, milestoneId, goalQuestId) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw new AppError("Goal not found.", 404);

  const milestone = goal.milestones.id(milestoneId);
  const goalQuest = milestone?.quests.id(goalQuestId);
  if (!milestone || !goalQuest) throw new AppError("Goal quest not found.", 404);

  const existing = await Quest.findOne({
    userId,
    goalId: goal._id,
    goalQuestId: goalQuest._id,
    status: { $in: ["active", "completed"] },
  });
  if (existing) return { quest: existing, alreadyAdded: true };

  const hunter = await Hunter.findOne({ userId }).select("level");
  const stat = CATEGORY_TO_STAT[goal.category] || "discipline";

  const quest = await Quest.create({
    userId,
    goalId: goal._id,
    goalQuestId: goalQuest._id,
    title: goalQuest.title,
    description: goalQuest.description || `Small step toward: ${goal.title}`,
    purpose: `Progress toward ${goal.title}`,
    category: goalQuest.category,
    difficulty: goalQuest.difficulty,
    xpReward: goalQuest.xpReward,
    statRewards: [{ stat, amount: hunter?.level >= 20 ? 2 : 3 }],
    expectedOutcome: goalQuest.description,
    generatedReason: "Created from your goal plan",
    targetValue: goalQuest.targetValue,
    unit: goalQuest.unit,
    evolutionLevel: 1,
    isSystemGenerated: false,
    dueAt: new Date(new Date().setHours(23, 59, 59, 999)),
  });

  return { quest, alreadyAdded: false };
};
