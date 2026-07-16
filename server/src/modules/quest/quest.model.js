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
    statRewards: [
      {
        stat: String,
        amount: { type: Number, min: 1, max: 20 },
        _id: false,
      },
    ],
    expectedOutcome: String,
    generatedReason: String,

    // Progress tracking
    targetValue: { type: Number, default: 1 },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, default: "" }, // "pages", "minutes", "steps"

    status: {
      type: String,
      enum: ["active", "completed", "failed", "expired"],
      default: "active",
    },
    evolutionLevel: { type: Number, default: 1, min: 1 },
    isSystemGenerated: { type: Boolean, default: true },

    dueAt: { type: Date, required: true },
    completedAt: Date,
    failedAt: Date,
  },
  { timestamps: true },
);

questSchema.index({ userId: 1, status: 1 });
questSchema.index({ userId: 1, category: 1 });
questSchema.index({ dueAt: 1, status: 1 });

export default mongoose.model("Quest", questSchema);
