import jwt from "jsonwebtoken";
import crypto from "crypto";
import { randomUUID } from "crypto";
import config from "../../config/env.js";
import User from "../user/user.model.js";
import Hunter from "../hunter/hunter.model.js";
import Stats from "../stats/stats.model.js";
import * as authRepo from "./auth.repository.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import { startOfDay, endOfDay } from "../../lib/helpers.js";
import { createNotification } from "../notification/notification.service.js";
import { sendEmail } from "../../lib/email/mailer.js";
import { passwordResetEmail } from "../../lib/email/templates.js";
import { getClientIp, parseDeviceInfo } from "../../lib/deviceInfo.js";

const generateTokens = (userId, sessionId) => {
  const accessToken = jwt.sign({ userId, sessionId }, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY,
  });
  const refreshToken = jwt.sign({ userId, sessionId }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY,
  });
  return { accessToken, refreshToken };
};

const bootstrapHunterProfile = async (userId, hunterName) => {
  await Promise.all([
    Hunter.create({ userId, hunterName }),
    Stats.create({ userId }),
    createNotification(
      userId,
      "systemAlert",
      "SYSTEM ALERT",
      `Welcome, ${hunterName}. The System has detected your awakening potential. Complete your assessment to unlock your true power.`,
      { isWelcome: true },
      null,
    ),
  ]);
};

export const register = async ({ email, password, hunterName, request = null }) => {
  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw new AppError("Email already registered.", 409);

  const existingName = await User.findOne({ hunterName });
  if (existingName) throw new AppError("Hunter name already taken.", 409);

  const user = await User.create({ email, password, hunterName });
  await bootstrapHunterProfile(user._id, hunterName);

  const sessionId = randomUUID();
  const { accessToken, refreshToken } = generateTokens(user._id, sessionId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const { device, browser, os, model, deviceName } = parseDeviceInfo(request?.headers?.["user-agent"] || "");
  await authRepo.saveRefreshToken(user._id, refreshToken, expiresAt, {
    sessionId, device, deviceName, browser, os, model,
    ipAddress: request ? getClientIp(request) : "Unknown",
    userAgent: request?.headers?.["user-agent"] || "",
  });

  return { user: user.toSafeObject(), accessToken, refreshToken };
};

export const login = async ({ email, password, request }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new AppError("Invalid email or password.", 401);
  if (!user.isActive) throw new AppError("Account deactivated.", 401);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError("Invalid email or password.", 401);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const sessionId = randomUUID();
  const { accessToken, refreshToken } = generateTokens(user._id, sessionId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const io = request?.app?.get("io");
  const { device, browser, os, model, deviceName } = parseDeviceInfo(request?.headers?.["user-agent"] || "");
  await authRepo.saveRefreshToken(user._id, refreshToken, expiresAt, {
    sessionId, device, deviceName, browser, os, model,
    ipAddress: getClientIp(request),
    userAgent: request?.headers?.["user-agent"] || "",
  });
  const ip = getClientIp(request);
  const loginTime = new Date().toLocaleString("en-IN", {
    timeZone: user.timezone || "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  });

  await createNotification(
    user._id,
    "systemAlert",
    "NEW LOGIN DETECTED",
    `A new login was detected from ${deviceName} using ${browser} on ${os}.`,
    { device, deviceName, browser, os, model, ip, loginTime, event: "login" },
    io,
  );

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

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+passwordResetTokenHash +passwordResetExpiresAt");

  // Always return success to avoid account enumeration.
  if (!user || !user.isActive) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + config.PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = expiresAt;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${config.CLIENT_URL}/reset-password?token=${rawToken}`;
  const message = await passwordResetEmail({
    hunterName: user.hunterName,
    resetUrl,
    expiresMinutes: config.PASSWORD_RESET_EXPIRY_MINUTES,
  });

  try {
    await sendEmail({ to: user.email, ...message });
  } catch (emailError) {
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save({ validateBeforeSave: false });
    throw new AppError("Unable to send the password reset email. Please try again later.", 503);
  }
};

export const resetPassword = async (rawToken, newPassword) => {
  if (!rawToken) throw new AppError("Reset token is required.", 400);

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+password +passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) throw new AppError("This password reset link is invalid or has expired.", 400);

  user.password = newPassword;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  // A password change invalidates every existing refresh session.
  await authRepo.revokeAllUserTokens(user._id);

  await createNotification(
    user._id,
    "systemAlert",
    "PASSWORD UPDATED",
    "Your password was changed successfully. Existing sessions have been signed out for your security.",
    { event: "password-reset" },
    null,
  );
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
  const sessionId = decoded.sessionId || storedToken.sessionId || randomUUID();
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    decoded.userId,
    sessionId,
  );
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await authRepo.saveRefreshToken(decoded.userId, newRefreshToken, expiresAt, {
    sessionId,
    device: storedToken.device,
    deviceName: storedToken.deviceName,
    browser: storedToken.browser,
    os: storedToken.os,
    ipAddress: storedToken.ipAddress,
    userAgent: storedToken.userAgent,
  });
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

  await createNotification(
    userId,
    "systemAlert",
    "AWAKENING COMPLETE",
    "The System has analyzed your potential. Your first daily quests have been assigned. The hunt begins now.",
    { isAwakening: true },
    null,
  );

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
