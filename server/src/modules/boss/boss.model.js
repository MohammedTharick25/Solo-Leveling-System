import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    xpReward: { type: Number, default: 100 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
  },
  { _id: true },
);

const bossSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    description: String,
    lore: String,
    hp: { type: Number, default: 100 },
    currentHp: { type: Number, default: 100 },
    challenges: [challengeSchema],
    status: {
      type: String,
      enum: ["active", "defeated", "fled"],
      default: "active",
    },
    xpReward: { type: Number, default: 500 },
    titleReward: String,
    shadowReward: String,
    badgeReward: String,
    spawnedByCondition: String,
    defeatedAt: Date,
  },
  { timestamps: true },
);

bossSchema.index({ userId: 1, status: 1 });

export default mongoose.model("Boss", bossSchema);
