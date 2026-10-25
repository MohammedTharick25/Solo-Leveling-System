import mongoose from "mongoose";

const questSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestTemplate",
      default: null,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
    },
    goalQuestId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    purpose: String,
    category: {
      type: String,
      required: true,
      enum: [
        "focus",
        "discipline",
        "health",
        "learning",
        "communication",
        "leadership",
        "productivity",
        "creativity",
        "finance",
        "emotionalControl",
        "timeManagement",
      ],
    },
    difficulty: {
      type: String,
      enum: ["F", "E", "D", "C", "B", "A", "S"],
      default: "D",
    },
    xpReward: { type: Number, required: true, min: 0 },
    earnedXP: { type: Number, default: 0, min: 0 },
    xpPenalty: { type: Number, default: 0, min: 0 },
    statRewards: [
      {
        stat: String,
        amount: { type: Number, min: 1, max: 20 },
        _id: false,
      },
    ],
    targetStat: {
      type: String,
      enum: [
        "strength", "agility", "intelligence", "vitality", "sense", "discipline",
        "communication", "leadership", "creativity", "financialIntelligence",
        "problemSolving", "emotionalControl", "timeManagement", null,
      ],
      default: null,
    },
    targetStatValue: { type: Number, min: 0, max: 100, default: null },
    targetReason: { type: String, enum: ["main goal", "lowest stat", null], default: null },
    recoveryHistory: [{
      replacedTitle: String,
      replacedDescription: String,
      replacedCategory: String,
      replacedTargetValue: Number,
      replacedCurrentValue: Number,
      replacedUnit: String,
      replacedAt: Date,
      _id: false,
    }],
    expectedOutcome: String,
    generatedReason: String,

    // Progress tracking
    targetValue: { type: Number, default: 1 },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, default: "" }, // "pages", "minutes", "steps"

    status: {
      type: String,
      enum: ["active", "completed", "failed", "expired", "recovered"],
      default: "active",
    },
    evolutionLevel: { type: Number, default: 1, min: 1 },
    isSystemGenerated: { type: Boolean, default: true },

    dueAt: { type: Date, required: true },
    completedAt: Date,
    failedAt: Date,
    recoveredAt: Date,
  },
  { timestamps: true },
);

questSchema.index({ userId: 1, category: 1 });
questSchema.index({ userId: 1, createdAt: 1 });
questSchema.index({ userId: 1, status: 1, createdAt: -1, updatedAt: -1 });
questSchema.index({ userId: 1, status: 1, dueAt: 1 });

export default mongoose.model("Quest", questSchema);
