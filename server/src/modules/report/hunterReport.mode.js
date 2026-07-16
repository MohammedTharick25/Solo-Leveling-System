import mongoose from "mongoose";

const hunterReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    mostImprovedStat: String,
    mostImprovedStatDelta: Number,
    weakestStat: String,
    weakestStatValue: Number,
    productivityTrend: {
      type: String,
      enum: ["rising", "stable", "declining"],
      default: "stable",
    },
    streakPerformance: { type: Number, default: 0 },
    questCompletionRate: { type: Number, default: 0, min: 0, max: 1 },
    totalQuestsAssigned: { type: Number, default: 0 },
    totalQuestsCompleted: { type: Number, default: 0 },
    totalXPEarned: { type: Number, default: 0 },
    totalFocusMinutes: { type: Number, default: 0 },
    suggestedFocusArea: String,
    personalizedRecommendations: [String],
    topAchievements: [String],
    statsSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    averageMood: Number,
    bossesDefeated: { type: Number, default: 0 },
    shadowsEvolved: { type: Number, default: 0 },
    level: Number,
    rank: String,
  },
  { timestamps: true },
);

hunterReportSchema.index({ userId: 1, weekStart: -1 }, { unique: true });

export default mongoose.model("HunterReport", hunterReportSchema);
