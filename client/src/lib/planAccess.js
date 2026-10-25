export const PREMIUM_FEATURES = {
  analytics: {
    label: "Advanced Analytics",
    description: "Turn your consistency and progress into clear next steps.",
    route: "/analytics",
    requiredTier: "hunter",
  },
  "ai-coach": {
    label: "AI Hunter Coach",
    description: "Get personalized coaching, plans, and recommendations.",
    route: "/ai-coach",
    requiredTier: "hunter",
  },
  brain: {
    label: "Second Brain",
    description: "Capture knowledge and connect ideas in your personal graph.",
    route: "/brain",
    requiredTier: "monarch",
  },
  shadows: {
    label: "Shadow Army",
    description: "Build and evolve your collection as you make progress.",
    route: "/shadows",
    requiredTier: "monarch",
  },
  bosses: {
    label: "Boss Battles",
    description: "Take on focused challenges with progression rewards.",
    route: "/bosses",
    requiredTier: "hunter",
  },
  dungeons: {
    label: "Dungeons",
    description: "Turn a larger challenge into a sequence of missions.",
    route: "/dungeons",
    requiredTier: "monarch",
  },
  raids: {
    label: "Task Raids",
    description: "Build structured challenge runs around your priorities.",
    route: "/raids",
    requiredTier: "monarch",
  },
};

export const PLAN_FEATURES = {
  free: ["Daily quests", "Goals & milestones", "Habits & streaks", "Focus sessions", "Journal & calendar", "Achievements", "Core progress"],
  hunter: ["Everything in Free", "Advanced analytics", "AI Hunter Coach", "Boss Battles"],
  monarch: ["Everything in Hunter", "Second Brain & knowledge graph", "Shadow Army", "Dungeons", "Task Raids"],
};

const TIER_RANK = { free: 0, hunter: 1, monarch: 2 };

export const hasTierAccess = (activeTier, requiredTier = "hunter") =>
  (TIER_RANK[activeTier] ?? 0) >= (TIER_RANK[requiredTier] ?? 1);
