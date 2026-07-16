import mongoose from "mongoose";

const journalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    mood: { type: Number, min: 1, max: 10 },
    energyLevel: { type: Number, min: 1, max: 10 },
    wins: [String],
    failures: [String],
    lessons: [String],
    challenges: [String],
    gratitude: [String],
    freeText: String,
    tomorrowPlan: String,
    aiInsights: {
      patterns: [String],
      suggestions: [String],
      weaknessesDetected: [String],
      strengthsDetected: [String],
      generatedAt: Date,
    },
    xpEarned: { type: Number, default: 10 },
    wordCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

journalSchema.index({ userId: 1, date: -1 }, { unique: true });

export default mongoose.model("Journal", journalSchema);
