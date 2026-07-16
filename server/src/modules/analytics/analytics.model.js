import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    xpEarned: { type: Number, default: 0 },
    questsCompleted: { type: Number, default: 0 },
    questsFailed: { type: Number, default: 0 },
    focusMinutes: { type: Number, default: 0 },
    focusSessionsCount: { type: Number, default: 0 },
    studyMinutes: { type: Number, default: 0 },
    exerciseMinutes: { type: Number, default: 0 },
    readingPages: { type: Number, default: 0 },
    raidsCompleted: { type: Number, default: 0 },
    moodScore: { type: Number, default: 0 },
    energyScore: { type: Number, default: 0 },
    streakDay: { type: Number, default: 0 },
    journalWritten: { type: Boolean, default: false },
    notesCreated: { type: Number, default: 0 },
    statsSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    productivityScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
);

analyticsSchema.index({ userId: 1, date: -1 }, { unique: true });

export default mongoose.model("Analytics", analyticsSchema);
