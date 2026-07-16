import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import config from "../../config/env.js";

const awakeningSchema = new mongoose.Schema({
  age: { type: Number, min: 10, max: 100 },
  occupation: String,
  isStudent: Boolean,
  goals: [String],
  dailySchedule: {
    wakeTime: String,
    sleepTime: String,
  },
  fitnessLevel: {
    type: String,
    enum: ["sedentary", "light", "moderate", "active", "athlete"],
  },
  learningInterests: [String],
  currentHabits: [String],
  biggestWeaknesses: [String],
  biggestStrengths: [String],
  availableDailyMinutes: Number,
  longTermVision: String,
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
    awakening: awakeningSchema,
    isAwakened: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    country: { type: String, default: "Unknown" },
    timezone: { type: String, default: "UTC" },
    lastLoginAt: Date,
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
  return obj;
};

export default mongoose.model("User", userSchema);
