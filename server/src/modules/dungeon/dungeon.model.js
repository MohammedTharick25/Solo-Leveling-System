import mongoose from "mongoose";

const DUNGEON_TYPES = [
  "study",
  "reading",
  "coding",
  "fitness",
  "deepWork",
  "discipline",
  "leadership",
  "communication",
];

const dungeonChallengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    xpReward: { type: Number, default: 50 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    order: { type: Number, required: true },
  },
  { _id: true },
);

const dungeonSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, required: true, enum: DUNGEON_TYPES },
    name: { type: String, required: true },
    description: String,
    difficulty: {
      type: String,
      enum: ["F", "E", "D", "C", "B", "A", "S"],
      default: "D",
    },
    challenges: [dungeonChallengeSchema],
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
    },
    totalXP: { type: Number, default: 0 },
    earnedXP: { type: Number, default: 0 },
    completionBonus: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    abandonedAt: Date,
  },
  { timestamps: true },
);

dungeonSchema.index({ userId: 1, status: 1 });

export default mongoose.model("Dungeon", dungeonSchema);
