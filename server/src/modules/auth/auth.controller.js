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

export const loginValidators = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
  validate,
];

export const register = asyncHandler(async (req, res) => {
  const { email, password, hunterName } = req.body;
  const result = await authService.register({ email, password, hunterName });
  sendSuccess(res, result, "Hunter registered successfully.", 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
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

export const completeAwakening = asyncHandler(async (req, res) => {
  const user = await authService.completeAwakening(req.userId, req.body);
  // Trigger initial quest generation
  await generateQuestsForUser(req.userId);
  sendSuccess(res, { user }, "Awakening complete. Your journey begins.");
});
