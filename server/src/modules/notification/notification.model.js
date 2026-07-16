import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "questAssigned",
        "questCompleted",
        "questFailed",
        "levelUp",
        "rankUp",
        "shadowUnlocked",
        "shadowEvolved",
        "bossAppeared",
        "bossDefeated",
        "dungeonCompleted",
        "achievementUnlocked",
        "streakMilestone",
        "systemAlert",
        "systemWarning",
        "systemUpdate",
        "friendRequest",
        "friendAccepted",
        "guildInvite",
        "guildChallenge",
        "weeklyReport",
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    iconType: { type: String, default: "info" },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
); // auto-delete after 30 days

export default mongoose.model("Notification", notificationSchema);
