import mongoose from "mongoose";

const guildChallengeSchema = new mongoose.Schema(
  {
    title: String,
    description: { type: String, trim: true, maxlength: 500 },
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

const sprintSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 80 },
  durationMinutes: { type: Number, enum: [25, 50], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ["active", "completed", "expired"], default: "active" },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
    completedAt: Date,
    focusSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "FocusSession" },
    minutes: { type: Number, default: 0 },
  }],
});

const weeklyQuestSchema = new mongoose.Schema({
  title: { type: String, default: "Complete 40 focus sessions together" },
  targetSessions: { type: Number, default: 40, min: 1, max: 500 },
  progress: { type: Number, default: 0 },
  rewardXP: { type: Number, default: 300 },
  periodStart: { type: Date, required: true },
  status: { type: String, enum: ["active", "completed"], default: "active" },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    optedInAt: { type: Date, default: Date.now },
    sessions: { type: Number, default: 0 },
  }],
});

const checkInSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dateKey: { type: String, required: true },
  goal: { type: String, required: true, trim: true, maxlength: 160 },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});

const guildActivitySchema = new mongoose.Schema({
  type: { type: String, enum: ["sprint", "quest", "checkin", "member", "challenge", "milestone"], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true, maxlength: 180 },
  createdAt: { type: Date, default: Date.now },
});

const guildSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
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
    sprints: [sprintSchema],
    weeklyQuest: { type: weeklyQuestSchema, default: null },
    checkIns: [checkInSchema],
    activityFeed: [guildActivitySchema],
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
