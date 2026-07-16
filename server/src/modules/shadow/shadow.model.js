import mongoose from "mongoose";

const SHADOW_TYPES = [
  "discipline",
  "focus",
  "knowledge",
  "health",
  "consistency",
  "communication",
  "leadership",
  "creativity",
  "finance",
  "problemSolving",
  "emotionalControl",
  "timeManagement",
];

const EVOLUTION_STAGES = ["Initiate", "Elite", "Commander", "Monarch"];

const shadowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: SHADOW_TYPES },
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    totalXPEarned: { type: Number, default: 0 },
    evolutionStage: {
      type: String,
      enum: EVOLUTION_STAGES,
      default: "Initiate",
    },
    unlockedAt: { type: Date, default: Date.now },
    unlockCondition: String,
    bonuses: [
      {
        description: String,
        value: Number,
        _id: false,
      },
    ],
    visualVariant: { type: Number, default: 1, min: 1, max: 4 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

shadowSchema.index({ userId: 1 });
shadowSchema.index({ userId: 1, type: 1 }, { unique: true });

shadowSchema.statics.SHADOW_TYPES = SHADOW_TYPES;
shadowSchema.statics.EVOLUTION_STAGES = EVOLUTION_STAGES;

export default mongoose.model("Shadow", shadowSchema);
