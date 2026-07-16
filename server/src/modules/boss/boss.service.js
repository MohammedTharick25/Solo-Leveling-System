import Boss from "./boss.model.js";
import Quest from "../quest/quest.model.js";
import { awardXP } from "../hunter/hunter.service.js";
import { createNotification } from "../notification/notification.service.js";
import Hunter from "../hunter/hunter.model.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

const BOSS_DEFINITIONS = [
  {
    name: "The Procrastination King",
    description:
      "A colossal entity born from accumulated delays. Its mere presence paralyzes action.",
    lore: 'It grows stronger with every task left undone, every "I\'ll start tomorrow" whispered in the dark.',
    spawnedByCondition: "questFailureStreak",
    challenges: [
      {
        title: "Complete 3 quests within a single day",
        description: "Prove you can execute when it matters.",
        xpReward: 200,
        order: 0,
      },
      {
        title: "Finish a Task Raid without snoozing it",
        description: "No delays. No excuses.",
        xpReward: 150,
        order: 1,
      },
      {
        title: "Start your first task within 5 minutes of waking for 3 days",
        description: "Break the hesitation cycle.",
        xpReward: 300,
        order: 2,
      },
    ],
    xpReward: 800,
    titleReward: "Procrastination Slayer",
  },
  {
    name: "The Doom Scroll Demon",
    description:
      "A shapeshifting void that consumes time through endless feeds and infinite content.",
    lore: "It feeds on distraction, growing more powerful with every mindless scroll.",
    spawnedByCondition: "focusInterruptions",
    challenges: [
      {
        title: "Complete 5 uninterrupted Pomodoro sessions",
        description: "Guard your focus like it is your lifeforce.",
        xpReward: 200,
        order: 0,
      },
      {
        title: "Log 3 phone-free mornings",
        description: "No screens for the first 60 minutes of each day.",
        xpReward: 250,
        order: 1,
      },
      {
        title: "Achieve a Focus Score above 80",
        description: "The system demands peak concentration.",
        xpReward: 300,
        order: 2,
      },
    ],
    xpReward: 750,
    titleReward: "Focus Ascendant",
  },
  {
    name: "The Sleep Destroyer",
    description:
      "A nocturnal terror that disrupts recovery cycles and drains vitality reserves.",
    lore: "Born from late nights and broken schedules, it steals the energy needed to grow.",
    spawnedByCondition: "lowVitality",
    challenges: [
      {
        title: "Sleep before your target time for 5 consecutive nights",
        description: "Discipline extends to the night.",
        xpReward: 200,
        order: 0,
      },
      {
        title: "Log 7 hours of sleep for 3 days",
        description: "Your body is the foundation of all power.",
        xpReward: 200,
        order: 1,
      },
      {
        title: "Complete a morning routine for 5 consecutive days",
        description: "Conquer the morning, conquer the day.",
        xpReward: 350,
        order: 2,
      },
    ],
    xpReward: 700,
    titleReward: "Vitality Sovereign",
  },
  {
    name: "The Excuse Titan",
    description:
      "An ancient construct built from every rationalization ever made to avoid difficulty.",
    lore: "It whispers reasons not to act. It thrives on justification.",
    spawnedByCondition: "lowDiscipline",
    challenges: [
      {
        title: "Complete a quest you have been avoiding for more than 2 days",
        description: "Confront what you have been running from.",
        xpReward: 300,
        order: 0,
      },
      {
        title: "Hit your daily target for 5 consecutive days",
        description: "No exceptions. No excuses.",
        xpReward: 250,
        order: 1,
      },
      {
        title: "Increase your discipline score by 5 points",
        description: "Let your actions speak louder than your reasons.",
        xpReward: 400,
        order: 2,
      },
    ],
    xpReward: 900,
    titleReward: "The Unyielding",
  },
  {
    name: "The Fear Beast",
    description:
      "A primordial entity manifested from avoided challenges and unrealized potential.",
    lore: "It stands at the gate of every level-up, daring you to back down.",
    spawnedByCondition: "lowGrowth",
    challenges: [
      {
        title: "Attempt something you have been afraid to start",
        description: "Take the first step into the unknown.",
        xpReward: 400,
        order: 0,
      },
      {
        title: "Complete a Difficulty A or higher quest",
        description: "Seek out difficulty instead of avoiding it.",
        xpReward: 300,
        order: 1,
      },
      {
        title: "Enter and complete a Dungeon",
        description: "Face the gauntlet without retreating.",
        xpReward: 500,
        order: 2,
      },
    ],
    xpReward: 1200,
    titleReward: "Fear Conqueror",
    shadowReward: "focus",
  },
];

export const checkBossSpawn = async (userId, io = null) => {
  const activeBoss = await Boss.findOne({ userId, status: "active" });
  if (activeBoss) return null;

  const hunter = await Hunter.findOne({ userId });
  const [recentQuestFailures, recentFocusInterruptions] = await Promise.all([
    Quest.countDocuments({
      userId,
      status: "failed",
      updatedAt: { $gte: new Date(Date.now() - 3 * 24 * 3600 * 1000) },
    }),
    Quest.countDocuments({
      // proxy using failed quests for now
      userId,
      status: "failed",
      category: "focus",
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    }),
  ]);

  let bossDefinition = null;

  if (recentQuestFailures >= 3) {
    bossDefinition = BOSS_DEFINITIONS.find(
      (b) => b.spawnedByCondition === "questFailureStreak",
    );
  } else if (recentFocusInterruptions >= 3) {
    bossDefinition = BOSS_DEFINITIONS.find(
      (b) => b.spawnedByCondition === "focusInterruptions",
    );
  } else if (hunter?.currentStreak === 0 && hunter.totalQuestCompletions > 5) {
    bossDefinition = BOSS_DEFINITIONS.find(
      (b) => b.spawnedByCondition === "lowDiscipline",
    );
  }

  if (!bossDefinition) return null;

  const boss = await Boss.create({
    userId,
    name: bossDefinition.name,
    description: bossDefinition.description,
    lore: bossDefinition.lore,
    challenges: bossDefinition.challenges,
    xpReward: bossDefinition.xpReward,
    titleReward: bossDefinition.titleReward,
    shadowReward: bossDefinition.shadowReward || null,
    spawnedByCondition: bossDefinition.spawnedByCondition,
  });

  if (io) io.to(`user:${userId}`).emit("system:boss-appeared", { boss });
  await createNotification(
    userId,
    "bossAppeared",
    `BOSS ALERT — ${boss.name}`,
    `${boss.description} Defeat it to claim powerful rewards.`,
    { bossId: boss._id },
    io,
  );

  return boss;
};

export const getActiveBoss = async (userId) => {
  return Boss.findOne({ userId, status: "active" });
};

export const getDefeatedBosses = async (userId) => {
  return Boss.find({ userId, status: "defeated" }).sort({ defeatedAt: -1 });
};

export const completeBossChallenge = async (
  bossId,
  challengeId,
  userId,
  io = null,
) => {
  const boss = await Boss.findOne({ _id: bossId, userId, status: "active" });
  if (!boss) throw new AppError("No active boss found.", 404);

  const challenge = boss.challenges.id(challengeId);
  if (!challenge) throw new AppError("Challenge not found.", 404);
  if (challenge.completed)
    throw new AppError("Challenge already completed.", 400);

  challenge.completed = true;
  challenge.completedAt = new Date();

  const completedCount = boss.challenges.filter((c) => c.completed).length;
  boss.currentHp = Math.max(
    0,
    100 - Math.floor((completedCount / boss.challenges.length) * 100),
  );

  let defeated = false;
  if (boss.currentHp <= 0) {
    boss.status = "defeated";
    boss.defeatedAt = new Date();
    defeated = true;

    await awardXP(userId, boss.xpReward, io);

    const hunter = await Hunter.findOne({ userId });
    if (boss.titleReward && !hunter.titles.includes(boss.titleReward)) {
      hunter.titles.push(boss.titleReward);
      await hunter.save();
    }

    if (io) io.to(`user:${userId}`).emit("system:boss-defeated", { boss });
    await createNotification(
      userId,
      "bossDefeated",
      `BOSS DEFEATED — ${boss.name}`,
      `${boss.name} has been vanquished. The title "${boss.titleReward}" is yours.`,
      { bossId: boss._id, title: boss.titleReward },
      io,
    );
  }

  await boss.save();
  // Award challenge XP
  await awardXP(userId, challenge.xpReward, io);

  return { boss, defeated, challengeXP: challenge.xpReward };
};
