import Hunter from "../hunter/hunter.model.js";
import Quest from "../quest/quest.model.js";
import FocusSession from "../focusSession/focusSession.model.js";
import Shadow from "../shadow/shadow.model.js";
import Boss from "../boss/boss.model.js";
import KnowledgeNote from "../brain/knowledgeNote.model.js";
import Journal from "../journal/journal.model.js";
import { createNotification } from "../notification/notification.service.js";

// ── Achievement Definitions ───────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  // Quest milestones
  {
    id: "first_quest",
    name: "First Blood",
    description: "Complete your first quest.",
    rarity: "common",
    icon: "⚔️",
    check: (s) => s.questsCompleted >= 1,
  },
  {
    id: "quests_10",
    name: "On the Hunt",
    description: "Complete 10 quests.",
    rarity: "common",
    icon: "🎯",
    check: (s) => s.questsCompleted >= 10,
  },
  {
    id: "quests_50",
    name: "Veteran Hunter",
    description: "Complete 50 quests.",
    rarity: "rare",
    icon: "🏹",
    check: (s) => s.questsCompleted >= 50,
  },
  {
    id: "quests_100",
    name: "Centurion",
    description: "Complete 100 quests.",
    rarity: "epic",
    icon: "💯",
    check: (s) => s.questsCompleted >= 100,
  },
  {
    id: "quests_500",
    name: "Legend of the Hunt",
    description: "Complete 500 quests.",
    rarity: "legendary",
    icon: "👑",
    check: (s) => s.questsCompleted >= 500,
  },

  // Streak milestones
  {
    id: "streak_3",
    name: "Consistent",
    description: "Maintain a 3-day streak.",
    rarity: "common",
    icon: "🔥",
    check: (s) => s.streak >= 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day streak.",
    rarity: "common",
    icon: "📅",
    check: (s) => s.streak >= 7,
  },
  {
    id: "streak_14",
    name: "Iron Will",
    description: "Maintain a 14-day streak.",
    rarity: "rare",
    icon: "🛡️",
    check: (s) => s.streak >= 14,
  },
  {
    id: "streak_30",
    name: "The Unstoppable",
    description: "Maintain a 30-day streak.",
    rarity: "epic",
    icon: "⚡",
    check: (s) => s.streak >= 30,
  },
  {
    id: "streak_100",
    name: "Shadow Monarch's Path",
    description: "Maintain a 100-day streak.",
    rarity: "legendary",
    icon: "🌑",
    check: (s) => s.streak >= 100,
  },

  // Level milestones
  {
    id: "level_5",
    name: "Awakened",
    description: "Reach Level 5.",
    rarity: "common",
    icon: "✨",
    check: (s) => s.level >= 5,
  },
  {
    id: "level_10",
    name: "Rising Hunter",
    description: "Reach Level 10.",
    rarity: "common",
    icon: "📈",
    check: (s) => s.level >= 10,
  },
  {
    id: "level_25",
    name: "Elite Rank",
    description: "Reach Level 25.",
    rarity: "rare",
    icon: "💎",
    check: (s) => s.level >= 25,
  },
  {
    id: "level_50",
    name: "S-Rank Aspirant",
    description: "Reach Level 50.",
    rarity: "epic",
    icon: "🌟",
    check: (s) => s.level >= 50,
  },
  {
    id: "level_100",
    name: "The Monarch",
    description: "Reach Level 100.",
    rarity: "legendary",
    icon: "👑",
    check: (s) => s.level >= 100,
  },

  // Focus milestones
  {
    id: "focus_first",
    name: "In the Zone",
    description: "Complete your first focus session.",
    rarity: "common",
    icon: "⏱️",
    check: (s) => s.focusSessions >= 1,
  },
  {
    id: "focus_10",
    name: "Focused Mind",
    description: "Complete 10 focus sessions.",
    rarity: "common",
    icon: "🎯",
    check: (s) => s.focusSessions >= 10,
  },
  {
    id: "focus_50",
    name: "Deep Worker",
    description: "Complete 50 focus sessions.",
    rarity: "rare",
    icon: "🧠",
    check: (s) => s.focusSessions >= 50,
  },
  {
    id: "focus_hours_10",
    name: "Time Investor",
    description: "Accumulate 10 hours of focus time.",
    rarity: "rare",
    icon: "⌛",
    check: (s) => s.focusMinutes >= 600,
  },
  {
    id: "focus_hours_50",
    name: "Grand Master Focus",
    description: "Accumulate 50 hours of focus time.",
    rarity: "epic",
    icon: "🔮",
    check: (s) => s.focusMinutes >= 3000,
  },

  // Boss milestones
  {
    id: "boss_first",
    name: "Boss Slayer",
    description: "Defeat your first boss.",
    rarity: "rare",
    icon: "💀",
    check: (s) => s.bossesDefeated >= 1,
  },
  {
    id: "boss_5",
    name: "Raid Veteran",
    description: "Defeat 5 bosses.",
    rarity: "epic",
    icon: "⚔️",
    check: (s) => s.bossesDefeated >= 5,
  },

  // Shadow milestones
  {
    id: "shadow_first",
    name: "Shadow Extractor",
    description: "Unlock your first shadow.",
    rarity: "rare",
    icon: "👁️",
    check: (s) => s.shadows >= 1,
  },
  {
    id: "shadow_5",
    name: "Shadow Commander",
    description: "Unlock 5 shadows.",
    rarity: "epic",
    icon: "👥",
    check: (s) => s.shadows >= 5,
  },
  {
    id: "shadow_all",
    name: "Shadow Monarch",
    description: "Unlock all 12 shadows.",
    rarity: "legendary",
    icon: "🌑",
    check: (s) => s.shadows >= 12,
  },

  // Knowledge milestones
  {
    id: "note_first",
    name: "Knowledge Seeker",
    description: "Create your first knowledge note.",
    rarity: "common",
    icon: "📝",
    check: (s) => s.notes >= 1,
  },
  {
    id: "note_25",
    name: "The Scholar",
    description: "Create 25 knowledge notes.",
    rarity: "rare",
    icon: "📚",
    check: (s) => s.notes >= 25,
  },
  {
    id: "note_100",
    name: "Living Library",
    description: "Create 100 knowledge notes.",
    rarity: "epic",
    icon: "🏛️",
    check: (s) => s.notes >= 100,
  },

  // Journal milestones
  {
    id: "journal_first",
    name: "Self-Reflective",
    description: "Write your first journal entry.",
    rarity: "common",
    icon: "📖",
    check: (s) => s.journals >= 1,
  },
  {
    id: "journal_7",
    name: "Inner Voice",
    description: "Write 7 journal entries.",
    rarity: "common",
    icon: "✍️",
    check: (s) => s.journals >= 7,
  },
  {
    id: "journal_30",
    name: "Chronicler",
    description: "Write 30 journal entries.",
    rarity: "rare",
    icon: "📜",
    check: (s) => s.journals >= 30,
  },

  // XP milestones
  {
    id: "xp_1000",
    name: "Power Rising",
    description: "Accumulate 1,000 total XP.",
    rarity: "common",
    icon: "⚡",
    check: (s) => s.totalXP >= 1000,
  },
  {
    id: "xp_10000",
    name: "XP Hoarder",
    description: "Accumulate 10,000 total XP.",
    rarity: "rare",
    icon: "💰",
    check: (s) => s.totalXP >= 10000,
  },
  {
    id: "xp_100000",
    name: "Power Incarnate",
    description: "Accumulate 100,000 total XP.",
    rarity: "legendary",
    icon: "🌠",
    check: (s) => s.totalXP >= 100000,
  },
];

// ── Stats collector ───────────────────────────────────────────────────────────
const collectStats = async (userId, hunter) => {
  const [focusSessions, shadows, notes, journals, bossesDefeated] =
    await Promise.all([
      FocusSession.countDocuments({ userId, completed: true }),
      Shadow.countDocuments({ userId }),
      KnowledgeNote.countDocuments({ userId }),
      Journal.countDocuments({ userId }),
      Boss.countDocuments({ userId, status: "defeated" }),
    ]);

  return {
    questsCompleted: hunter.totalQuestCompletions || 0,
    streak: hunter.currentStreak || 0,
    level: hunter.level || 1,
    totalXP: hunter.totalXP || 0,
    focusSessions,
    focusMinutes: hunter.totalFocusMinutes || 0,
    bossesDefeated,
    shadows,
    notes,
    journals,
  };
};

// ── Main checker ──────────────────────────────────────────────────────────────
export const checkAndAwardAchievements = async (userId, io = null) => {
  const hunter = await Hunter.findOne({ userId });
  if (!hunter) return [];

  const unlockedIds = new Set((hunter.achievements || []).map((a) => a.id));
  const stats = await collectStats(userId, hunter);
  const newAchievements = [];

  for (const def of ACHIEVEMENTS) {
    if (unlockedIds.has(def.id)) continue;
    if (!def.check(stats)) continue;

    const achievement = {
      id: def.id,
      name: def.name,
      description: def.description,
      rarity: def.rarity,
      icon: def.icon,
      unlockedAt: new Date(),
    };

    hunter.achievements.push(achievement);
    newAchievements.push(achievement);

    await createNotification(
      userId,
      "achievementUnlocked",
      `ACHIEVEMENT UNLOCKED — ${def.name}`,
      `${def.icon} ${def.description}`,
      { achievementId: def.id, rarity: def.rarity },
      io,
    );

    if (io) {
      io.to(`user:${userId}`).emit("system:achievement", { achievement });
    }
  }

  if (newAchievements.length > 0) {
    await hunter.save();
  }

  return newAchievements;
};

export const getAchievements = async (userId) => {
  const hunter = await Hunter.findOne({ userId }).select("achievements");
  if (!hunter) return { unlocked: [], locked: [] };

  const unlockedIds = new Set((hunter.achievements || []).map((a) => a.id));

  const unlocked = hunter.achievements || [];
  const locked = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id)).map(
    (a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      rarity: a.rarity,
      icon: a.icon,
    }),
  );

  return { unlocked, locked, total: ACHIEVEMENTS.length };
};
