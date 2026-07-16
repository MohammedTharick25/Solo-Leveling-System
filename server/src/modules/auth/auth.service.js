import jwt from "jsonwebtoken";
import config from "../../config/env.js";
import User from "../user/user.model.js";
import Hunter from "../hunter/hunter.model.js";
import Stats from "../stats/stats.model.js";
import Notification from "../notification/notification.model.js";
import * as authRepo from "./auth.repository.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { startOfDay, endOfDay } from "../../lib/helpers.js";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY,
  });
  const refreshToken = jwt.sign({ userId }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY,
  });
  return { accessToken, refreshToken };
};

const bootstrapHunterProfile = async (userId, hunterName) => {
  await Promise.all([
    Hunter.create({ userId, hunterName }),
    Stats.create({ userId }),
    Notification.create({
      userId,
      type: "systemAlert",
      title: "SYSTEM ALERT",
      message: `Welcome, ${hunterName}. The System has detected your awakening potential. Complete your assessment to unlock your true power.`,
      metadata: { isWelcome: true },
    }),
  ]);
};

export const register = async ({ email, password, hunterName }) => {
  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw new AppError("Email already registered.", 409);

  const existingName = await User.findOne({ hunterName });
  if (existingName) throw new AppError("Hunter name already taken.", 409);

  const user = await User.create({ email, password, hunterName });
  await bootstrapHunterProfile(user._id, hunterName);

  const { accessToken, refreshToken } = generateTokens(user._id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await authRepo.saveRefreshToken(user._id, refreshToken, expiresAt);

  return { user: user.toSafeObject(), accessToken, refreshToken };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new AppError("Invalid email or password.", 401);
  if (!user.isActive) throw new AppError("Account deactivated.", 401);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError("Invalid email or password.", 401);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = generateTokens(user._id);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await authRepo.saveRefreshToken(user._id, refreshToken, expiresAt);

  // Auto-generate today's quests if awakened and none exist yet
  if (user.isAwakened) {
    try {
      const { generateQuestsForUser } =
        await import("../quest/quest.service.js");
      await generateQuestsForUser(user._id);
    } catch {}
  }

  return { user: user.toSafeObject(), accessToken, refreshToken };
};

export const refreshTokens = async (token) => {
  if (!token) throw new AppError("Refresh token required.", 401);
  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  const storedToken = await authRepo.findRefreshToken(token);
  if (!storedToken)
    throw new AppError("Refresh token revoked or not found.", 401);

  await authRepo.revokeRefreshToken(token);
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    decoded.userId,
  );
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await authRepo.saveRefreshToken(decoded.userId, newRefreshToken, expiresAt);
  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (token) => {
  if (token) await authRepo.revokeRefreshToken(token);
};

export const completeAwakening = async (userId, awakeningData) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      awakening: { ...awakeningData, completedAt: new Date() },
      isAwakened: true,
    },
    { new: true, runValidators: true },
  );
  if (!user) throw new AppError("User not found.", 404);

  await Notification.create({
    userId,
    type: "systemAlert",
    title: "AWAKENING COMPLETE",
    message:
      "The System has analyzed your potential. Your first daily quests have been assigned. The hunt begins now.",
    metadata: { isAwakening: true },
  });

  // Generate first day's quests immediately after awakening
  try {
    const { generateQuestsForUser } = await import("../quest/quest.service.js");
    await generateQuestsForUser(userId);
  } catch {}

  return user.toSafeObject();
};

// ── Daily Login Bonus ─────────────────────────────────────────────────────────
export const claimDailyBonus = async (userId, io = null) => {
  const hunter = await Hunter.findOne({ userId });
  if (!hunter) return { alreadyClaimed: true, xpEarned: 0 };

  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  // Check if already claimed today using a lightweight marker
  const alreadyClaimedToday =
    hunter.lastActiveDate &&
    new Date(hunter.lastActiveDate) >= todayStart &&
    new Date(hunter.lastActiveDate) <= todayEnd &&
    hunter._bonusClaimedToday === true;

  // Use a separate field to track bonus (not lastActiveDate which streak uses)
  const bonusRecord = await Hunter.findOne({
    userId,
    bonusClaimedAt: { $gte: todayStart, $lte: todayEnd },
  });

  if (bonusRecord) return { alreadyClaimed: true, xpEarned: 0 };

  // Streak-based bonus: +10 XP per 7 days of streak, max +100
  const streakBonus = Math.min(
    Math.floor((hunter.currentStreak || 0) / 7) * 10,
    100,
  );
  const baseXP = 25;
  const xpEarned = baseXP + streakBonus;

  // Mark bonus claimed today
  await Hunter.findOneAndUpdate({ userId }, { bonusClaimedAt: new Date() });

  // Award XP
  const { awardXP } = await import("../hunter/hunter.service.js");
  await awardXP(userId, xpEarned, io);

  return { alreadyClaimed: false, xpEarned, streakBonus };
};
