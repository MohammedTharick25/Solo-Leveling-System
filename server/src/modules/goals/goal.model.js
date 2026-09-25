import mongoose from "mongoose";

const goalQuestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 500 },
    category: { type: String, default: "productivity" },
    difficulty: { type: String, enum: ["F", "E", "D", "C", "B", "A", "S"], default: "D" },
    xpReward: { type: Number, default: 30, min: 0, max: 500 },
    targetValue: { type: Number, default: 1, min: 1 },
    unit: { type: String, default: "task", maxlength: 40 },
  },
  { _id: true },
);

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["locked", "active", "completed"], default: "active" },
    order: { type: Number, default: 1 },
    quests: { type: [goalQuestSchema], default: [] },
  },
  { _id: true },
);

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 500 },
    category: {
      type: String,
      enum: ["learning", "health", "career", "finance", "personal", "fitness", "productivity", "other"],
      default: "personal",
    },
    targetDate: { type: Date, default: null },
    status: { type: String, enum: ["active", "completed", "paused"], default: "active" },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    whyItMatters: { type: String, default: "" },
    milestones: { type: [milestoneSchema], default: [] },
    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

goalSchema.index({ userId: 1, status: 1, createdAt: -1 });

export default mongoose.model("Goal", goalSchema);
