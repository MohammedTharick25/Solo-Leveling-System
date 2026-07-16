import mongoose from "mongoose";

const completionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    note: String,
  },
  { _id: false },
);

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: String,
    icon: { type: String, default: "✅" },
    color: { type: String, default: "cyan" },
    category: {
      type: String,
      enum: [
        "health",
        "learning",
        "discipline",
        "focus",
        "communication",
        "creativity",
        "finance",
        "other",
      ],
      default: "other",
    },
    frequency: {
      type: String,
      enum: ["daily", "weekdays", "weekends", "custom"],
      default: "daily",
    },
    targetDays: [{ type: Number, min: 0, max: 6 }], // 0=Sun … 6=Sat (for custom)
    xpReward: { type: Number, default: 20 },
    statReward: { stat: String, amount: { type: Number, default: 1 } },

    // Streak tracking
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalCompletions: { type: Number, default: 0 },

    // Rolling 90-day completion log
    completions: [completionSchema],

    isActive: { type: Boolean, default: true },
    archivedAt: Date,
  },
  { timestamps: true },
);

habitSchema.index({ userId: 1, isActive: 1 });
habitSchema.index({ userId: 1, category: 1 });

export default mongoose.model("Habit", habitSchema);
