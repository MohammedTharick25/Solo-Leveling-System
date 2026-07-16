import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import QuestTemplate from "../../modules/quest/questTemplate.model.js";


const QUEST_TEMPLATES = [
  // ── FOCUS ────────────────────────────────────────────────────────────────
  {
    name: "Pomodoro Focus Session",
    category: "focus",
    targetStat: "sense",
    triggerCondition: { stat: "sense", operator: "lt", threshold: 50 },
    baseDifficulty: "D",
    baseXP: 60,
    expectedOutcome: "Sharpen your concentration and build the focus habit.",
    statRewards: [{ stat: "sense", amount: 3 }],
    evolutionStages: [
      {
        level: 1,
        title: "Enter the Zone",
        description:
          "Complete one 25-minute Pomodoro session without interruption.",
        targetValue: 1,
        unit: "session",
        xpReward: 60,
        difficulty: "E",
      },
      {
        level: 2,
        title: "Deep Focus Block",
        description:
          "Complete two 25-minute Pomodoro sessions in a single day.",
        targetValue: 2,
        unit: "sessions",
        xpReward: 90,
        difficulty: "D",
      },
      {
        level: 3,
        title: "Concentration Streak",
        description: "Complete four Pomodoro sessions in a single day.",
        targetValue: 4,
        unit: "sessions",
        xpReward: 140,
        difficulty: "C",
      },
      {
        level: 4,
        title: "Deep Work Marathon",
        description: "Complete a 90-minute uninterrupted deep work block.",
        targetValue: 90,
        unit: "minutes",
        xpReward: 200,
        difficulty: "B",
      },
      {
        level: 5,
        title: "Flow State Mastery",
        description:
          "Complete a full 4-hour deep work session with a single 15-min break.",
        targetValue: 240,
        unit: "minutes",
        xpReward: 350,
        difficulty: "A",
      },
    ],
  },
  {
    name: "Distraction Audit",
    category: "focus",
    targetStat: "sense",
    triggerCondition: { stat: "sense", operator: "lt", threshold: 40 },
    baseDifficulty: "E",
    baseXP: 40,
    expectedOutcome: "Identify and eliminate your top distractions.",
    statRewards: [
      { stat: "sense", amount: 2 },
      { stat: "discipline", amount: 1 },
    ],
    evolutionStages: [
      {
        level: 1,
        title: "Name Your Demons",
        description:
          "Write down your 3 biggest distractions and one solution for each.",
        targetValue: 1,
        unit: "audit",
        xpReward: 40,
        difficulty: "F",
      },
      {
        level: 2,
        title: "Cut the Feed",
        description:
          "Remove all social media apps from your phone for the day.",
        targetValue: 1,
        unit: "day",
        xpReward: 70,
        difficulty: "D",
      },
      {
        level: 3,
        title: "Digital Detox",
        description: "Go phone-free for your first 3 hours of work for 3 days.",
        targetValue: 3,
        unit: "days",
        xpReward: 130,
        difficulty: "C",
      },
    ],
  },

  // ── DISCIPLINE ───────────────────────────────────────────────────────────
  {
    name: "Morning Protocol",
    category: "discipline",
    targetStat: "discipline",
    triggerCondition: { stat: "discipline", operator: "lt", threshold: 50 },
    baseDifficulty: "D",
    baseXP: 70,
    expectedOutcome:
      "Establish a consistent morning routine that sets your day.",
    statRewards: [{ stat: "discipline", amount: 4 }],
    evolutionStages: [
      {
        level: 1,
        title: "Rise On Time",
        description: "Wake up at your planned time for one day.",
        targetValue: 1,
        unit: "day",
        xpReward: 50,
        difficulty: "F",
      },
      {
        level: 2,
        title: "Three-Day Protocol",
        description: "Wake up at your planned time for 3 consecutive days.",
        targetValue: 3,
        unit: "days",
        xpReward: 80,
        difficulty: "E",
      },
      {
        level: 3,
        title: "Morning Warrior",
        description:
          "Complete your full morning routine for 7 consecutive days.",
        targetValue: 7,
        unit: "days",
        xpReward: 140,
        difficulty: "D",
      },
      {
        level: 4,
        title: "Iron Routine",
        description:
          "Complete your full morning routine for 14 consecutive days.",
        targetValue: 14,
        unit: "days",
        xpReward: 220,
        difficulty: "C",
      },
      {
        level: 5,
        title: "Unbreakable Protocol",
        description:
          "Complete your full morning routine for 30 consecutive days.",
        targetValue: 30,
        unit: "days",
        xpReward: 400,
        difficulty: "B",
      },
    ],
  },
  {
    name: "Task Completion Blitz",
    category: "discipline",
    targetStat: "discipline",
    triggerCondition: { stat: "discipline", operator: "lt", threshold: 60 },
    baseDifficulty: "D",
    baseXP: 80,
    expectedOutcome: "Build the habit of finishing what you start.",
    statRewards: [
      { stat: "discipline", amount: 3 },
      { stat: "timeManagement", amount: 2 },
    ],
    evolutionStages: [
      {
        level: 1,
        title: "Finish One Thing",
        description: "Complete one pending Task Raid today.",
        targetValue: 1,
        unit: "raid",
        xpReward: 60,
        difficulty: "E",
      },
      {
        level: 2,
        title: "Clear the Queue",
        description: "Complete 3 Task Raids in a single day.",
        targetValue: 3,
        unit: "raids",
        xpReward: 100,
        difficulty: "D",
      },
      {
        level: 3,
        title: "Full Execution Day",
        description:
          "Complete all planned tasks for the day — zero carried over.",
        targetValue: 1,
        unit: "perfect day",
        xpReward: 180,
        difficulty: "C",
      },
    ],
  },

  // ── HEALTH ───────────────────────────────────────────────────────────────
  {
    name: "Movement Quest",
    category: "health",
    targetStat: "strength",
    triggerCondition: { stat: "strength", operator: "lt", threshold: 40 },
    baseDifficulty: "D",
    baseXP: 70,
    expectedOutcome: "Build your physical base and energy levels.",
    statRewards: [
      { stat: "strength", amount: 4 },
      { stat: "vitality", amount: 2 },
    ],
    evolutionStages: [
      {
        level: 1,
        title: "First Steps",
        description: "Walk 2,000 steps today.",
        targetValue: 2000,
        unit: "steps",
        xpReward: 50,
        difficulty: "F",
      },
      {
        level: 2,
        title: "Active Hunter",
        description: "Walk 5,000 steps today.",
        targetValue: 5000,
        unit: "steps",
        xpReward: 80,
        difficulty: "E",
      },
      {
        level: 3,
        title: "Body Activation",
        description: "Complete a 20-minute workout.",
        targetValue: 20,
        unit: "minutes",
        xpReward: 120,
        difficulty: "D",
      },
      {
        level: 4,
        title: "Strength Protocol",
        description: "Complete a 40-minute resistance training session.",
        targetValue: 40,
        unit: "minutes",
        xpReward: 180,
        difficulty: "C",
      },
      {
        level: 5,
        title: "Elite Conditioning",
        description: "Complete a 60-minute high-intensity workout.",
        targetValue: 60,
        unit: "minutes",
        xpReward: 280,
        difficulty: "B",
      },
    ],
  },
  {
    name: "Sleep Optimization",
    category: "health",
    targetStat: "vitality",
    triggerCondition: { stat: "vitality", operator: "lt", threshold: 45 },
    baseDifficulty: "D",
    baseXP: 60,
    expectedOutcome:
      "Restore your energy systems through disciplined recovery.",
    statRewards: [{ stat: "vitality", amount: 5 }],
    evolutionStages: [
      {
        level: 1,
        title: "Early Retreat",
        description: "Be in bed before your target sleep time for one night.",
        targetValue: 1,
        unit: "night",
        xpReward: 50,
        difficulty: "E",
      },
      {
        level: 2,
        title: "Recovery Protocol",
        description: "Sleep 7+ hours for 3 consecutive nights.",
        targetValue: 3,
        unit: "nights",
        xpReward: 90,
        difficulty: "D",
      },
      {
        level: 3,
        title: "Vitality Cycle",
        description: "Maintain consistent sleep and wake times for 7 days.",
        targetValue: 7,
        unit: "days",
        xpReward: 160,
        difficulty: "C",
      },
    ],
  },
  {
    name: "Hydration Protocol",
    category: "health",
    targetStat: "vitality",
    triggerCondition: { stat: "vitality", operator: "lt", threshold: 55 },
    baseDifficulty: "E",
    baseXP: 40,
    expectedOutcome: "Optimize your body's most fundamental fuel source.",
    statRewards: [{ stat: "vitality", amount: 2 }],
    evolutionStages: [
      {
        level: 1,
        title: "Water Warrior",
        description: "Drink 2 litres of water today.",
        targetValue: 2000,
        unit: "ml",
        xpReward: 40,
        difficulty: "F",
      },
      {
        level: 2,
        title: "Hydration Streak",
        description: "Drink 2.5 litres of water for 3 consecutive days.",
        targetValue: 3,
        unit: "days",
        xpReward: 70,
        difficulty: "E",
      },
    ],
  },

  // ── LEARNING ─────────────────────────────────────────────────────────────
  {
    name: "Reading Protocol",
    category: "learning",
    targetStat: "intelligence",
    triggerCondition: { stat: "intelligence", operator: "lt", threshold: 50 },
    baseDifficulty: "D",
    baseXP: 60,
    expectedOutcome: "Expand your mind through consistent reading.",
    statRewards: [{ stat: "intelligence", amount: 4 }],
    evolutionStages: [
      {
        level: 1,
        title: "Open the Book",
        description: "Read for 15 minutes without stopping.",
        targetValue: 15,
        unit: "minutes",
        xpReward: 50,
        difficulty: "F",
      },
      {
        level: 2,
        title: "The Learning Hour",
        description: "Read 20 pages today.",
        targetValue: 20,
        unit: "pages",
        xpReward: 80,
        difficulty: "E",
      },
      {
        level: 3,
        title: "Knowledge Seeker",
        description: "Read 30 pages and write a 3-bullet summary.",
        targetValue: 30,
        unit: "pages",
        xpReward: 130,
        difficulty: "D",
      },
      {
        level: 4,
        title: "The Scholar",
        description: "Read 50 pages and create a knowledge note.",
        targetValue: 50,
        unit: "pages",
        xpReward: 200,
        difficulty: "C",
      },
      {
        level: 5,
        title: "Knowledge Architect",
        description:
          "Read a full chapter, summarize it, and teach the concept back.",
        targetValue: 1,
        unit: "chapter",
        xpReward: 320,
        difficulty: "B",
      },
    ],
  },
  {
    name: "Skill Deep Dive",
    category: "learning",
    targetStat: "intelligence",
    triggerCondition: { stat: "intelligence", operator: "lt", threshold: 60 },
    baseDifficulty: "C",
    baseXP: 90,
    expectedOutcome: "Make measurable progress on a chosen skill.",
    statRewards: [
      { stat: "intelligence", amount: 5 },
      { stat: "problemSolving", amount: 2 },
    ],
    evolutionStages: [
      {
        level: 1,
        title: "Skill Initiation",
        description:
          "Complete one lesson or module on a skill you are developing.",
        targetValue: 1,
        unit: "lesson",
        xpReward: 70,
        difficulty: "D",
      },
      {
        level: 2,
        title: "Skill Builder",
        description: "Complete 3 lessons or modules in a single day.",
        targetValue: 3,
        unit: "lessons",
        xpReward: 120,
        difficulty: "C",
      },
      {
        level: 3,
        title: "Mastery Path",
        description: "Spend 2 focused hours on deliberate skill practice.",
        targetValue: 120,
        unit: "minutes",
        xpReward: 200,
        difficulty: "B",
      },
    ],
  },

  // ── COMMUNICATION ─────────────────────────────────────────────────────────
  {
    name: "Communication Forge",
    category: "communication",
    targetStat: "communication",
    triggerCondition: { stat: "communication", operator: "lt", threshold: 40 },
    baseDifficulty: "D",
    baseXP: 70,
    expectedOutcome:
      "Build clarity, confidence and connection through deliberate communication.",
    statRewards: [{ stat: "communication", amount: 4 }],
    evolutionStages: [
      {
        level: 1,
        title: "Clear Message",
        description:
          "Write one clear, well-structured email or message with a specific outcome.",
        targetValue: 1,
        unit: "message",
        xpReward: 60,
        difficulty: "E",
      },
      {
        level: 2,
        title: "Active Listener",
        description:
          "Have one meaningful conversation — listen more than you speak.",
        targetValue: 1,
        unit: "conversation",
        xpReward: 90,
        difficulty: "D",
      },
      {
        level: 3,
        title: "Connection Builder",
        description: "Reach out to someone you have been meaning to contact.",
        targetValue: 1,
        unit: "connection",
        xpReward: 130,
        difficulty: "C",
      },
      {
        level: 4,
        title: "Influence Architect",
        description:
          "Write a persuasive piece: pitch, proposal, or argument and get feedback.",
        targetValue: 1,
        unit: "piece",
        xpReward: 200,
        difficulty: "B",
      },
    ],
  },

  // ── LEADERSHIP ───────────────────────────────────────────────────────────
  {
    name: "Leadership Lab",
    category: "leadership",
    targetStat: "leadership",
    triggerCondition: { stat: "leadership", operator: "lt", threshold: 35 },
    baseDifficulty: "C",
    baseXP: 90,
    expectedOutcome:
      "Develop your ability to lead, influence and take ownership.",
    statRewards: [
      { stat: "leadership", amount: 4 },
      { stat: "communication", amount: 2 },
    ],
    evolutionStages: [
      {
        level: 1,
        title: "Own It",
        description:
          "Take full responsibility for one outcome today — no excuses.",
        targetValue: 1,
        unit: "decision",
        xpReward: 80,
        difficulty: "D",
      },
      {
        level: 2,
        title: "Solve the Problem",
        description:
          "Identify a problem affecting your team or environment and propose a solution.",
        targetValue: 1,
        unit: "solution",
        xpReward: 120,
        difficulty: "C",
      },
      {
        level: 3,
        title: "Lead by Example",
        description:
          "Demonstrate the behaviour you want to see in others for 3 consecutive days.",
        targetValue: 3,
        unit: "days",
        xpReward: 200,
        difficulty: "B",
      },
    ],
  },

  // ── TIME MANAGEMENT ───────────────────────────────────────────────────────
  {
    name: "Time Architect",
    category: "timeManagement",
    targetStat: "timeManagement",
    triggerCondition: { stat: "timeManagement", operator: "lt", threshold: 45 },
    baseDifficulty: "D",
    baseXP: 70,
    expectedOutcome: "Transform how you plan and use your time.",
    statRewards: [
      { stat: "timeManagement", amount: 4 },
      { stat: "discipline", amount: 2 },
    ],
    evolutionStages: [
      {
        level: 1,
        title: "Plan Your Day",
        description: "Write a time-blocked schedule before 9 AM and follow it.",
        targetValue: 1,
        unit: "day",
        xpReward: 60,
        difficulty: "E",
      },
      {
        level: 2,
        title: "Time Block Week",
        description: "Plan and execute time blocks for 5 consecutive days.",
        targetValue: 5,
        unit: "days",
        xpReward: 120,
        difficulty: "D",
      },
      {
        level: 3,
        title: "Zero Waste Day",
        description:
          "Complete the day with all tasks done and no carried-over items.",
        targetValue: 1,
        unit: "perfect day",
        xpReward: 200,
        difficulty: "C",
      },
    ],
  },

  // ── EMOTIONAL CONTROL ──────────────────────────────────────────────────────
  {
    name: "Inner Fortress",
    category: "emotionalControl",
    targetStat: "emotionalControl",
    triggerCondition: {
      stat: "emotionalControl",
      operator: "lt",
      threshold: 40,
    },
    baseDifficulty: "D",
    baseXP: 65,
    expectedOutcome: "Build mental resilience and emotional regulation.",
    statRewards: [
      { stat: "emotionalControl", amount: 4 },
      { stat: "sense", amount: 2 },
    ],
    evolutionStages: [
      {
        level: 1,
        title: "Mindful Pause",
        description: "Meditate or breathe intentionally for 10 minutes today.",
        targetValue: 10,
        unit: "minutes",
        xpReward: 55,
        difficulty: "F",
      },
      {
        level: 2,
        title: "Emotional Log",
        description: "Journal your emotional state and triggers for 3 days.",
        targetValue: 3,
        unit: "days",
        xpReward: 90,
        difficulty: "E",
      },
      {
        level: 3,
        title: "Stoic Response",
        description:
          "Encounter a frustrating situation and respond calmly. Log the experience.",
        targetValue: 1,
        unit: "instance",
        xpReward: 150,
        difficulty: "D",
      },
      {
        level: 4,
        title: "Equanimity Protocol",
        description:
          "Maintain a calm, deliberate response in high-stress situations for 7 days.",
        targetValue: 7,
        unit: "days",
        xpReward: 260,
        difficulty: "C",
      },
    ],
  },

  // ── CREATIVITY ────────────────────────────────────────────────────────────
  {
    name: "Creative Output",
    category: "creativity",
    targetStat: "creativity",
    triggerCondition: { stat: "creativity", operator: "lt", threshold: 35 },
    baseDifficulty: "D",
    baseXP: 65,
    expectedOutcome:
      "Develop your ability to generate and refine original ideas.",
    statRewards: [{ stat: "creativity", amount: 4 }],
    evolutionStages: [
      {
        level: 1,
        title: "Idea Dump",
        description:
          "Generate 10 ideas on any topic in 10 minutes. No filters.",
        targetValue: 10,
        unit: "ideas",
        xpReward: 55,
        difficulty: "E",
      },
      {
        level: 2,
        title: "Build Something",
        description:
          "Create a small tangible output: a design, piece of writing, or prototype.",
        targetValue: 1,
        unit: "creation",
        xpReward: 100,
        difficulty: "D",
      },
      {
        level: 3,
        title: "Creative Session",
        description: "Spend 60 minutes in uninterrupted creative work.",
        targetValue: 60,
        unit: "minutes",
        xpReward: 160,
        difficulty: "C",
      },
    ],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("[SEED] Connected to MongoDB");

    await QuestTemplate.deleteMany({});
    console.log("[SEED] Cleared existing templates");

    const inserted = await QuestTemplate.insertMany(QUEST_TEMPLATES);
    console.log(`[SEED] Inserted ${inserted.length} quest templates`);

    await mongoose.disconnect();
    console.log("[SEED] Done. Disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("[SEED] Error:", err.message);
    process.exit(1);
  }
};

seed();
