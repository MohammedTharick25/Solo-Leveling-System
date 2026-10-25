import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import config from "../../config/env.js";

const awakeningSchema = new mongoose.Schema({
  age: { type: Number, required: [true, "Age is required"], min: 10, max: 100 },
  occupation: { type: String, required: [true, "Occupation / field is required"], trim: true, maxlength: 120 },
  isStudent: { type: Boolean, required: [true, "Student status is required"] },
  goals: { type: [String], required: true, validate: { validator: (value) => value.length >= 1 && value.length <= 3, message: "Provide between 1 and 3 goals" } },
  dailySchedule: {
    wakeTime: { type: String, required: [true, "Wake time is required"] },
    sleepTime: { type: String, required: [true, "Sleep time is required"] },
  },
  fitnessLevel: {
    type: String,
    required: [true, "Fitness level is required"],
    enum: ["sedentary", "light", "moderate", "active", "athlete"],
  },
  learningInterests: { type: [String], required: true, validate: { validator: (value) => value.length >= 1, message: "Provide at least one learning interest" } },
  currentHabits: [String],
  biggestWeaknesses: { type: [String], required: true, validate: { validator: (value) => value.length >= 1, message: "Provide at least one weakness" } },
  biggestStrengths: { type: [String], required: true, validate: { validator: (value) => value.length >= 1, message: "Provide at least one strength" } },
  availableDailyMinutes: { type: Number, required: [true, "Available daily minutes are required"], min: 10, max: 1440 },
  longTermVision: { type: String, required: [true, "Long-term vision is required"], trim: true, maxlength: 500 },
  completedAt: Date,
});

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    hunterName: {
      type: String,
      required: [true, "Hunter name is required"],
      unique: true,
      trim: true,
      minlength: [3, "Hunter name must be at least 3 characters"],
      maxlength: [20, "Hunter name cannot exceed 20 characters"],
    },
    avatar: {
      url: { type: String, default: "" }, // Default to empty string
      public_id: { type: String },
    },
    awakening: awakeningSchema,
    isAwakened: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    country: { type: String, default: "Unknown", trim: true, maxlength: 80 },
    timezone: { type: String, default: "UTC", trim: true, maxlength: 100 },
    timezoneSet: { type: Boolean, default: false },
    dailyQuestGenerationLockUntil: { type: Date, default: null },
    bio: { type: String, default: "", trim: true, maxlength: 240 },
    billing: {
      tier: { type: String, enum: ["free", "hunter", "monarch"], default: "free" },
      trialStartedAt: { type: Date, default: null },
      trialEndsAt: { type: Date, default: null },
      trialUsedAt: { type: Date, default: null },
      planChosenAt: { type: Date, default: null },
      upgradePending: { type: Boolean, default: false },
      upgradePendingSubscriptionId: { type: String, default: null },
      upgradePendingOldSubscriptionId: { type: String, default: null },
      upgradePendingAccessUntil: { type: Date, default: null },
      upgradePendingCreditAmount: { type: Number, default: null },
      upgradePendingConvertedDays: { type: Number, default: null },
      upgradeAccessUntil: { type: Date, default: null },
      upgradeCreditAmount: { type: Number, default: null },
      upgradeConvertedDays: { type: Number, default: null },
      status: {
        type: String,
        enum: ["inactive", "created", "authenticated", "active", "pending", "halted", "cancelled", "completed", "expired"],
        default: "inactive",
      },
      provider: { type: String, enum: ["razorpay"], default: null },
      razorpaySubscriptionId: { type: String, default: null },
      razorpayPlanId: { type: String, default: null },
      lastPaymentId: { type: String, default: null },
      currentPeriodStart: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
      cancelAtCycleEnd: { type: Boolean, default: false },
      pendingTier: { type: String, enum: ["hunter", "monarch", null], default: null },
      pendingTierEffectiveAt: { type: Date, default: null },
    },
    settings: {
      notifications: {
        enabled: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        desktop: { type: Boolean, default: false },
        email: { type: Boolean, default: false },
        securityAlerts: { type: Boolean, default: true },
        questUpdates: { type: Boolean, default: true },
        progression: { type: Boolean, default: true },
        social: { type: Boolean, default: true },
        weeklyReports: { type: Boolean, default: true },
        streakReminderEnabled: { type: Boolean, default: false },
        streakReminderTime: { type: String, default: "19:00" },
      },
      preferences: {
        soundEffects: { type: Boolean, default: true },
        compactMode: { type: Boolean, default: false },
      },
      privacy: {
        publicProfile: { type: Boolean, default: true },
        showPublicStats: { type: Boolean, default: true },
        showPublicAchievements: { type: Boolean, default: true },
      },
    },
    pushSubscriptions: [{
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
      createdAt: { type: Date, default: Date.now },
    }],
    lastStreakReminderDate: { type: String, default: "" },
    lastLoginAt: Date,
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpiresAt: { type: Date, select: false, default: null },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, config.BCRYPT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.pushSubscriptions;
  delete obj.lastStreakReminderDate;
  delete obj.dailyQuestGenerationLockUntil;
  return obj;
};

export default mongoose.model("User", userSchema);
