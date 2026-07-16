import mongoose from "mongoose";

const statEntrySchema = new mongoose.Schema(
  {
    value: { type: Number, default: 10, min: 0, max: 100 },
    history: [
      {
        value: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: false },
);

const LIFE_STATS = [
  "strength",
  "agility",
  "intelligence",
  "vitality",
  "sense",
  "discipline",
  "communication",
  "leadership",
  "creativity",
  "financialIntelligence",
  "problemSolving",
  "emotionalControl",
  "timeManagement",
];

const statsFields = {};
LIFE_STATS.forEach((stat) => {
  statsFields[stat] = {
    type: statEntrySchema,
    default: () => ({ value: 10, history: [] }),
  };
});

const statsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    ...statsFields,

    // Productivity scores — computed by the intelligence engine
    focusScore: { type: Number, default: 0, min: 0, max: 100 },
    disciplineScore: { type: Number, default: 0, min: 0, max: 100 },
    learningScore: { type: Number, default: 0, min: 0, max: 100 },
    healthScore: { type: Number, default: 0, min: 0, max: 100 },
    momentumScore: { type: Number, default: 0, min: 0, max: 100 },
    energyScore: { type: Number, default: 0, min: 0, max: 100 },
    consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    performanceScore: { type: Number, default: 0, min: 0, max: 100 },

    lastComputedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

statsSchema.statics.LIFE_STATS = LIFE_STATS;

export default mongoose.model("Stats", statsSchema);
