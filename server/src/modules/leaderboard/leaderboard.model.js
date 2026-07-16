import mongoose from "mongoose";

const leaderboardEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  hunterName: String,
  rank: String,
  level: Number,
  totalXP: Number,
  weeklyXP: Number,
  powerScore: Number,
  currentStreak: Number,
  position: Number,
  change: { type: Number, default: 0 }, // position change vs last period
  country: String,
  _id: false,
});

const leaderboardSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["global", "country", "guild"],
      required: true,
    },
    period: {
      type: String,
      enum: ["weekly", "monthly", "allTime"],
      required: true,
    },
    guildId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guild",
      default: null,
    },
    country: { type: String, default: null },
    entries: [leaderboardEntrySchema],
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

leaderboardSchema.index({ type: 1, period: 1, guildId: 1 });

export default mongoose.model("Leaderboard", leaderboardSchema);
