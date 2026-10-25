import mongoose from "mongoose";

const scheduledRunSchema = new mongoose.Schema(
  {
    _id: { type: String },
    lockUntil: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

scheduledRunSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ScheduledRun", scheduledRunSchema);
