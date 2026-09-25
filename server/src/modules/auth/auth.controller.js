import { body } from "express-validator";
import * as authService from "./auth.service.js";
import { generateQuestsForUser } from "../quest/quest.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { validate } from "../../middleware/validate.middleware.js";

export const registerValidators = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("hunterName")
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Hunter name must be 3-20 chars, letters/numbers/underscores only",
    ),
  validate,
];


export const awakeningValidators = [
  body("age").isInt({ min: 10, max: 100 }).withMessage("Age must be between 10 and 100"),
  body("occupation").trim().notEmpty().isLength({ max: 120 }).withMessage("Occupation / field is required"),
  body("isStudent").isBoolean().withMessage("Student status is required"),
  body("dailySchedule.wakeTime").trim().notEmpty().withMessage("Wake time is required"),
  body("dailySchedule.sleepTime").trim().notEmpty().withMessage("Sleep time is required"),
  body("availableDailyMinutes").isInt({ min: 10, max: 1440 }).withMessage("Available daily minutes must be between 10 and 1440"),
  body("fitnessLevel").isIn(["sedentary", "light", "moderate", "active", "athlete"]).withMessage("Fitness level is required"),
  body("longTermVision").trim().notEmpty().isLength({ max: 500 }).withMessage("Long-term vision is required"),
  body("goals").isArray({ min: 1, max: 3 }).withMessage("Provide between 1 and 3 goals"),
  body("goals.*").trim().notEmpty().withMessage("Goals cannot be empty"),
  body("biggestWeaknesses").isArray({ min: 1 }).withMessage("Provide at least one weakness"),
  body("biggestWeaknesses.*").trim().notEmpty().withMessage("Weaknesses cannot be empty"),
  body("biggestStrengths").isArray({ min: 1 }).withMessage("Provide at least one strength"),
  body("biggestStrengths.*").trim().notEmpty().withMessage("Strengths cannot be empty"),
  body("learningInterests").isArray({ min: 1 }).withMessage("Provide at least one learning interest"),
  body("learningInterests.*").trim().notEmpty().withMessage("Learning interests cannot be empty"),
  validate,
];

export const passwordResetRequestValidators = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  validate,
];

export const passwordResetValidators = [
  body("token").notEmpty().withMessage("Reset token required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  validate,
];

export const loginValidators = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
  validate,
];

export const register = asyncHandler(async (req, res) => {
  const { email, password, hunterName } = req.body;
  const result = await authService.register({ email, password, hunterName, request: req });
  sendSuccess(res, result, "Hunter registered successfully.", 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password, request: req });
  // Set refresh token in httpOnly cookie
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 3600 * 1000,
  });
  sendSuccess(
    res,
    { user: result.user, accessToken: result.accessToken },
    "Login successful.",
  );
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refreshTokens(token);
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 3600 * 1000,
  });
  sendSuccess(res, { accessToken: result.accessToken }, "Tokens refreshed.");
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logout(token);
  res.clearCookie("refreshToken");
  sendSuccess(res, {}, "Logged out successfully.");
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  sendSuccess(res, {}, "If an account exists for that email, a password reset link has been sent.");
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.clearCookie("refreshToken");
  sendSuccess(res, {}, "Password reset successfully. You can now sign in with your new password.");
});

export const completeAwakening = asyncHandler(async (req, res) => {
  const user = await authService.completeAwakening(req.userId, req.body);
  // Trigger initial quest generation
  await generateQuestsForUser(req.userId);
  sendSuccess(res, { user }, "Awakening complete. Your journey begins.");
});
