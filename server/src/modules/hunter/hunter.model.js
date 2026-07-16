import mongoose from 'mongoose';

const RANKS = ['Unawakened', 'E', 'D', 'C', 'B', 'A', 'S', 'National', 'Monarch', 'Shadow Monarch'];

const hunterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hunterName: { type: String, required: true },
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },           // current level XP
    totalXP: { type: Number, default: 0, min: 0 },       // cumulative, never resets
    rank: { type: String, enum: RANKS, default: 'Unawakened' },
    title: { type: String, default: 'The Beginner' },
    titles: { type: [String], default: ['The Beginner'] },
    powerScore: { type: Number, default: 0, min: 0 },
    potentialRating: { type: Number, default: 0, min: 0, max: 100 },
    consistencyRating: { type: Number, default: 0, min: 0, max: 100 },
    growthRating: { type: Number, default: 0, min: 0, max: 100 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalQuestCompletions: { type: Number, default: 0 },
    totalFocusMinutes: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: Date.now },
    bonusClaimedAt: { type: Date, default: null },   // tracks daily login bonus
    guildId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guild', default: null },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    achievements: [
      {
        id: String,
        name: String,
        description: String,
        unlockedAt: Date,
        rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'] },
      },
    ],
  },
  { timestamps: true }
);

hunterSchema.virtual('xpToNextLevel').get(function () {
  return Math.floor(100 * Math.pow(this.level, 1.8));
});

hunterSchema.virtual('xpProgress').get(function () {
  return Math.min((this.xp / this.xpToNextLevel) * 100, 100);
});

hunterSchema.set('toJSON', { virtuals: true });
hunterSchema.set('toObject', { virtuals: true });

hunterSchema.index({ totalXP: -1 });
hunterSchema.index({ userId: 1 });

export default mongoose.model('Hunter', hunterSchema);