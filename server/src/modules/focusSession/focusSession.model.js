import mongoose from "mongoose";

const focusSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["pomodoro", "deepWork", "study", "reading"],
      default: "pomodoro",
    },
    plannedDuration: { type: Number, required: true }, // minutes
    actualDuration: { type: Number, default: 0 },
    breakDuration: { type: Number, default: 5 },
    completed: { type: Boolean, default: false },
    interrupted: { type: Boolean, default: false },
    interruptionCount: { type: Number, default: 0 },
    focusScore: { type: Number, default: 0, min: 0, max: 100 },
    xpEarned: { type: Number, default: 0 },
    skillXpEarned: { type: Number, default: 0 },
    linkedRaidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskRaid",
      default: null,
    },
    linkedQuestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quest",
      default: null,
    },
    notes: String,
    tags: [String],
    startedAt: { type: Date, required: true },
    endedAt: Date,
  },
  { timestamps: true },
);

focusSessionSchema.index({ userId: 1, startedAt: -1 });
focusSessionSchema.index({ userId: 1, type: 1 });
focusSessionSchema.index({ userId: 1, completed: 1 });

export default mongoose.model("FocusSession", focusSessionSchema);
