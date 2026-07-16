import Shadow from "./shadow.model.js";
import Hunter from "../hunter/hunter.model.js";
import Quest from "../quest/quest.model.js";
import FocusSession from "../focusSession/focusSession.model.js";
import { createNotification } from "../notification/notification.service.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

const EVOLUTION_XP_THRESHOLDS = {
  Initiate: 0,
  Elite: 500,
  Commander: 2000,
  Monarch: 6000,
};

const EVOLUTION_STAGES = ["Initiate", "Elite", "Commander", "Monarch"];

const SHADOW_UNLOCK_CONDITIONS = [
  {
    type: "discipline",
    name: "Shadow of Discipline",
    check: async (userId, hunter) => hunter.currentStreak >= 7,
    condition: "7-day activity streak",
    bonuses: [{ description: "Quest XP +5%", value: 5 }],
  },
  {
    type: "focus",
    name: "Shadow of Focus",
    check: async (userId) => {
      const count = await FocusSession.countDocuments({
        userId,
        completed: true,
      });
      return count >= 10;
    },
    condition: "Complete 10 focus sessions",
    bonuses: [{ description: "Focus Session XP +10%", value: 10 }],
  },
  {
    type: "knowledge",
    name: "Shadow of Knowledge",
    check: async (userId) => {
      const count = await Quest.countDocuments({
        userId,
        category: "learning",
        status: "completed",
      });
      return count >= 20;
    },
    condition: "Complete 20 learning quests",
    bonuses: [{ description: "Intelligence stat gains +15%", value: 15 }],
  },
  {
    type: "health",
    name: "Shadow of Vitality",
    check: async (userId) => {
      const count = await Quest.countDocuments({
        userId,
        category: "health",
        status: "completed",
      });
      return count >= 15;
    },
    condition: "Complete 15 health quests",
    bonuses: [{ description: "Health stat gains +10%", value: 10 }],
  },
  {
    type: "consistency",
    name: "Shadow of Consistency",
    check: async (userId, hunter) => hunter.totalQuestCompletions >= 50,
    condition: "Complete 50 total quests",
    bonuses: [{ description: "Streak bonus multiplier +5%", value: 5 }],
  },
  {
    type: "communication",
    name: "Shadow of Influence",
    check: async (userId) => {
      const count = await Quest.countDocuments({
        userId,
        category: "communication",
        status: "completed",
      });
      return count >= 10;
    },
    condition: "Complete 10 communication quests",
    bonuses: [{ description: "Communication stat gains +12%", value: 12 }],
  },
  {
    type: "leadership",
    name: "Shadow of Command",
    check: async (userId) => {
      const count = await Quest.countDocuments({
        userId,
        category: "leadership",
        status: "completed",
      });
      return count >= 10;
    },
    condition: "Complete 10 leadership quests",
    bonuses: [{ description: "Leadership stat gains +12%", value: 12 }],
  },
];

export const checkShadowUnlocks = async (userId, io = null) => {
  const [hunter, existingShadows] = await Promise.all([
    Hunter.findOne({ userId }),
    Shadow.find({ userId }).select("type"),
  ]);

  const unlockedTypes = new Set(existingShadows.map((s) => s.type));
  const newShadows = [];

  for (const def of SHADOW_UNLOCK_CONDITIONS) {
    if (unlockedTypes.has(def.type)) continue;

    const eligible = await def.check(userId, hunter);
    if (!eligible) continue;

    const shadow = await Shadow.create({
      userId,
      name: def.name,
      type: def.type,
      unlockCondition: def.condition,
      bonuses: def.bonuses,
      unlockedAt: new Date(),
    });

    newShadows.push(shadow);

    if (io) io.to(`user:${userId}`).emit("system:shadow-unlocked", { shadow });
    await createNotification(
      userId,
      "shadowUnlocked",
      "SHADOW UNLOCKED",
      `${def.name} has emerged from the abyss. A new power serves you.`,
      { shadowId: shadow._id, name: shadow.name },
      io,
    );
  }

  return newShadows;
};

export const addShadowXP = async (shadowId, userId, xpAmount, io = null) => {
  const shadow = await Shadow.findOne({ _id: shadowId, userId });
  if (!shadow) throw new AppError("Shadow not found.", 404);

  shadow.xp += xpAmount;
  shadow.totalXPEarned += xpAmount;

  const currentStageIdx = EVOLUTION_STAGES.indexOf(shadow.evolutionStage);
  const nextStage = EVOLUTION_STAGES[currentStageIdx + 1];

  if (nextStage && shadow.xp >= EVOLUTION_XP_THRESHOLDS[nextStage]) {
    shadow.evolutionStage = nextStage;
    shadow.visualVariant = currentStageIdx + 2;

    if (io) io.to(`user:${userId}`).emit("system:shadow-evolved", { shadow });
    await createNotification(
      userId,
      "shadowEvolved",
      "SHADOW EVOLUTION",
      `${shadow.name} has evolved to ${nextStage} stage. Its power grows immeasurably.`,
      { shadowId: shadow._id, stage: nextStage },
      io,
    );
  }

  await shadow.save();
  return shadow;
};

export const getUserShadows = async (userId) => {
  return Shadow.find({ userId }).sort({ evolutionStage: -1, xp: -1 });
};

export const getShadowById = async (shadowId, userId) => {
  const shadow = await Shadow.findOne({ _id: shadowId, userId });
  if (!shadow) throw new AppError("Shadow not found.", 404);
  return shadow;
};
