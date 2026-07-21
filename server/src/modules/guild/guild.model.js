import mongoose from "mongoose";

const guildChallengeSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    xpReward: Number,
    firstCompleterBonus: { type: Number, default: 50 },
    firstCompleterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deadline: Date,
    status: {
      type: String,
      enum: ["active", "completed", "expired"],
      default: "active",
    },
    completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

const guildSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: String,
    tag: { type: String, maxlength: 5, uppercase: true },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["leader", "officer", "member"],
          default: "member",
        },
        joinedAt: { type: Date, default: Date.now },
        contribution: { type: Number, default: 0 },
        _id: false,
      },
    ],
    totalXP: { type: Number, default: 0 },
    weeklyXP: { type: Number, default: 0 },
    rank: { type: Number, default: 999 },
    level: { type: Number, default: 1 },
    challenges: [guildChallengeSchema],
    isPublic: { type: Boolean, default: true },
    maxMembers: { type: Number, default: 50 },
    requirementRank: { type: String, default: "E" },
    banner: String,
    announcement: String,
  },
  { timestamps: true },
);

guildSchema.index({ totalXP: -1 });
guildSchema.index({ name: "text", description: "text" });
// Speeds up the cron sweep that looks for active challenges past deadline
guildSchema.index({ "challenges.status": 1, "challenges.deadline": 1 });

export default mongoose.model("Guild", guildSchema);
