import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";

import config from "./config/env.js";
import { rateLimiter } from "./middleware/rateLimiter.middleware.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";

// Routes
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import hunterRoutes from "./modules/hunter/hunter.routes.js";
import statsRoutes from "./modules/stats/stats.routes.js";
import questRoutes from "./modules/quest/quest.routes.js";
import shadowRoutes from "./modules/shadow/shadow.routes.js";
import bossRoutes from "./modules/boss/boss.routes.js";
import dungeonRoutes from "./modules/dungeon/dungeon.routes.js";
import focusRoutes from "./modules/focusSession/focusSession.routes.js";
import raidRoutes from "./modules/taskRaid/taskRaid.routes.js";
import journalRoutes from "./modules/journal/journal.routes.js";
import brainRoutes from "./modules/brain/brain.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import guildRoutes from "./modules/guild/guild.routes.js";
import leaderboardRoutes from "./modules/leaderboard/leaderboard.routes.js";
import notificationRoutes from "./modules/notification/notification.routes.js";
import reportRoutes from "./modules/report/report.routes.js";
import habitRoutes from "./modules/habits/habit.routes.js";
import achievementRoutes from "./modules/achievements/achievement.routes.js";

const app = express();

// ── Security ─────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "https://res.cloudinary.com",
          "https://img.icons8.com",
        ], // Allow Cloudinary & Icons8
        connectSrc: ["'self'", "http://localhost:5000", "ws://localhost:5000"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allows images to be shared across ports
  }),
);
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);
app.use(mongoSanitize());

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "success",
    message: "The System is online.",
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
const API = "/api/v1";

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/hunter`, hunterRoutes);
app.use(`${API}/stats`, statsRoutes);
app.use(`${API}/quests`, questRoutes);
app.use(`${API}/shadows`, shadowRoutes);
app.use(`${API}/bosses`, bossRoutes);
app.use(`${API}/dungeons`, dungeonRoutes);
app.use(`${API}/focus`, focusRoutes);
app.use(`${API}/raids`, raidRoutes);
app.use(`${API}/journal`, journalRoutes);
app.use(`${API}/brain`, brainRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/guilds`, guildRoutes);
app.use(`${API}/leaderboard`, leaderboardRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/habits`, habitRoutes);
app.use(`${API}/achievements`, achievementRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: "error", message: "Route not found." });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
