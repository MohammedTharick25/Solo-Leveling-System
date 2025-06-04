// src/config.js
export const INITIAL_XP_FOR_LEVEL_UP = 100;
export const XP_MULTIPLIER = 1.5;

export const INITIAL_PILLAR_XP_FOR_LEVEL_UP = 50;
export const PILLAR_XP_MULTIPLIER = 1.4;

export const PILLAR_DEFINITIONS = {
  health: {
    name: "Health & Fitness",
    icon: "❤️",
    color: "#e74c3c",
    tasks: [
      { text: "Complete 20 Push-ups", pillarXp: 15, mainXp: 2, type: "MAIN", penaltyHp: 0 },
      { text: "Go for a 20-minute brisk walk or jog", pillarXp: 20, mainXp: 3, type: "MAIN", penaltyHp: 0 },
      { text: "Perform a 10-minute stretching routine", pillarXp: 10, mainXp: 1, type: "MAIN", penaltyHp: 0 },
    ],
  },
  productivity: {
    name: "Productivity & Focus",
    icon: "🚀",
    color: "#3498db",
    tasks: [
      { text: "Engage in a 25-minute Pomodoro focus session", pillarXp: 20, mainXp: 3, type: "MAIN", penaltyHp: 0 },
      { text: "Outline and plan your tasks for tomorrow", pillarXp: 15, mainXp: 2, type: "MAIN", penaltyHp: 0 },
    ],
  },
  learning: {
    name: "Learning & Growth",
    icon: "🧠",
    color: "#f1c40f",
    tasks: [
      { text: "Read an insightful article or book chapter for 20 minutes", pillarXp: 20, mainXp: 3, type: "MAIN", penaltyHp: 0 },
      { text: "Dedicate 30 minutes to practicing a new skill", pillarXp: 25, mainXp: 4, type: "MAIN", penaltyHp: 0 },
    ],
  },
  mindfulness: {
    name: "Mindfulness & Wellbeing",
    icon: "🧘",
    color: "#2ecc71",
    tasks: [
      { text: "Practice 10 minutes of guided or unguided meditation", pillarXp: 15, mainXp: 2, type: "MAIN", penaltyHp: 0 },
      { text: "Journal your thoughts and feelings for 10 minutes", pillarXp: 15, mainXp: 2, type: "MAIN", penaltyHp: 0 },
    ],
  },
};

export const initialPillarsState = Object.keys(PILLAR_DEFINITIONS).reduce((acc, pillarKey) => {
  acc[pillarKey] = {
    level: 1,
    xp: 0,
    nextLevelXp: INITIAL_PILLAR_XP_FOR_LEVEL_UP,
    name: PILLAR_DEFINITIONS[pillarKey].name,
    icon: PILLAR_DEFINITIONS[pillarKey].icon,
    color: PILLAR_DEFINITIONS[pillarKey].color,
  };
  return acc;
}, {});


export const INITIAL_HP = 100;
export const HP_REGENERATION_PER_DAY = 100; // Full HP regen daily

export const DAILY_TASK_DEFINITIONS = [
  { text: "Engage in 15 minutes of light exercise (walk, stretch)", pillarKey: "health", pillarXp: 10, mainXp: 1, penaltyHp: 5 },
  { text: "Drink your target amount of water today", pillarKey: "health", pillarXp: 5, mainXp: 1, penaltyHp: 3 },
  { text: "Ensure at least 7 hours of sleep (log previous night)", pillarKey: "health", pillarXp: 10, mainXp: 2, penaltyHp: 5 },
  { text: "Identify your Top 3 priorities for the day", pillarKey: "productivity", pillarXp: 10, mainXp: 2, penaltyHp: 5 },
  { text: "Spend 10 minutes tidying your workspace", pillarKey: "productivity", pillarXp: 5, mainXp: 1, penaltyHp: 3 },
  { text: "Read one news article or blog post related to your interests", pillarKey: "learning", pillarXp: 10, mainXp: 1, penaltyHp: 3 },
  { text: "Practice 5 minutes of mindful observation", pillarKey: "mindfulness", pillarXp: 10, mainXp: 1, penaltyHp: 3 },
  { text: "Write down one thing you appreciate today", pillarKey: "mindfulness", pillarXp: 5, mainXp: 1, penaltyHp: 2 },
  { text: "Quick review: Check your Main Quests for progress", pillarKey: null, mainXp: 2, penaltyHp: 2 },
  { text: "Positive Affirmation: State one positive goal for the day", pillarKey: null, mainXp: 1, penaltyHp: 1 },
];

export const NUMBER_OF_RANDOM_DAILY_TASKS = 3;