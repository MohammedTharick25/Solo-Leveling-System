import mongoose from "mongoose";

const evolutionStageSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    targetValue: { type: Number, required: true },
    unit: { type: String, default: "" },
    xpReward: { type: Number, required: true },
    difficulty: { type: String, enum: ["F", "E", "D", "C", "B", "A", "S"] },
  },
  { _id: false },
);

const questTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
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
    targetStat: { type: String, required: true },
    triggerCondition: {
      stat: String,
      operator: { type: String, enum: ["lt", "lte", "gt", "gte"] },
      threshold: Number,
    },
    evolutionStages: [evolutionStageSchema],
    baseDifficulty: {
      type: String,
      enum: ["F", "E", "D", "C", "B", "A", "S"],
      default: "D",
    },
    baseXP: { type: Number, default: 50 },
    statRewards: [
      {
        stat: String,
        amount: Number,
        _id: false,
      },
    ],
    expectedOutcome: String,
    isActive: { type: Boolean, default: true },
    tags: [String],
  },
  { timestamps: true },
);

questTemplateSchema.index({ category: 1, isActive: 1 });
questTemplateSchema.index({ targetStat: 1 });

export default mongoose.model("QuestTemplate", questTemplateSchema);
