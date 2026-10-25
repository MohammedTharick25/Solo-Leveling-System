import cron from "node-cron";
import User from "../../modules/user/user.model.js";
import Guild from "../../modules/guild/guild.model.js";
import { generateQuestsForUser, expireMissedQuests } from "../../modules/quest/quest.service.js";
import { computeAndSaveStats } from "../../modules/stats/stats.service.js";
import { generateWeeklyReport } from "../../modules/report/report.routes.js";
import { rebuildLeaderboard } from "../../modules/leaderboard/leaderboard.routes.js";
import { checkAndUpdateStreaks } from "../../modules/hunter/hunter.service.js";
import { recordDailySnapshot } from "../../modules/analytics/analytics.routes.js";
import { sendDueStreakReminders } from "../../modules/notification/push.service.js";
import { getZonedDateKey, getZonedDateTimeParts, normalizeTimeZone } from "../../lib/timeZones.js";
import { recordOpsEvent } from "../../lib/opsMetrics.js";
import { runScheduledOnce } from "./runScheduledOnce.js";

const dailyRunDates = new Map();

export const startCronJobs = (io) => {
  console.log("[CRON] Scheduler started");

  cron.schedule("* * * * *", async () => {
    try {
      await sendDueStreakReminders();
      const users = await User.find({ isActive: true, isAwakened: true }).select("_id timezone").lean();
      const now = new Date();
      for (const user of users) {
        const local = getZonedDateTimeParts(now, normalizeTimeZone(user.timezone));
        const dayKey = getZonedDateKey(now, normalizeTimeZone(user.timezone));
        let runState = dailyRunDates.get(String(user._id));
        const timezone = normalizeTimeZone(user.timezone);
        if (!runState || runState.dayKey !== dayKey || runState.timezone !== timezone) {
          runState = { dayKey, timezone };
          dailyRunDates.set(String(user._id), runState);
        }
        const localMinute = local.hour * 60 + local.minute;
        try {
          if (!runState.streak && localMinute >= 1) {
            const ran = await runScheduledOnce(
              `daily:${user._id}:${dayKey}:streak`,
              () => checkAndUpdateStreaks(user._id, io),
            );
            if (!ran) continue;
            runState.streak = true;
          }
          if (!runState.expiry && localMinute >= 2) {
            const ran = await runScheduledOnce(
              `daily:${user._id}:${dayKey}:expiry`,
              () => expireMissedQuests(user._id, io, now),
            );
            if (!ran) continue;
            runState.expiry = true;
          }
          if (!runState.quests && localMinute >= 360) {
            const ran = await runScheduledOnce(
              `daily:${user._id}:${dayKey}:quests`,
              () => generateQuestsForUser(user._id, io),
            );
            if (!ran) continue;
            runState.quests = true;
          }
          if (!runState.snapshot && localMinute >= 1435) {
            const ran = await runScheduledOnce(
              `daily:${user._id}:${dayKey}:snapshot`,
              () => recordDailySnapshot(user._id),
            );
            if (!ran) continue;
            runState.snapshot = true;
          }
        } catch (error) {
          recordOpsEvent("scheduler", "local_daily_task_failed", "error", error);
          console.error(`[CRON] Local-day task failed for ${user._id}: ${error.message}`);
        }
      }
    } catch (error) {
      recordOpsEvent("scheduler", "minute_scheduler_failed", "error", error);
      console.error("[CRON] Device streak reminder delivery failed:", error.message);
    }
  });

  // Recompute productivity stats every four hours.
  cron.schedule("0 */4 * * *", async () => {
    console.log("[CRON] Stats recompute...");
    try {
      const now = new Date();
      const runKey = `stats:${now.toISOString().slice(0, 10)}:${String(now.getUTCHours()).padStart(2, "0")}`;
      await runScheduledOnce(runKey, async () => {
        const users = await User.find({ isActive: true }).select("_id").lean();
        for (const user of users) {
          try {
            await computeAndSaveStats(user._id);
          } catch (error) {
            recordOpsEvent("scheduler", "stats_recompute_user_failed", "error", error);
          }
        }
      });
      console.log("[CRON] Stats recompute complete.");
    } catch (err) {
      recordOpsEvent("scheduler", "stats_recompute_failed", "error", err);
      console.error("[CRON] Stats recompute error:", err.message);
    }
  });

  // Generate weekly Hunter reports every Monday at 00:05 UTC.
  cron.schedule("5 0 * * 1", async () => {
    console.log("[CRON] Weekly reports...");
    try {
      const runKey = `weekly-reports:${new Date().toISOString().slice(0, 10)}`;
      await runScheduledOnce(runKey, async () => {
        const users = await User.find({ isActive: true, isAwakened: true })
          .select("_id")
          .lean();
        for (const user of users) {
          try {
            await generateWeeklyReport(user._id, io);
          } catch (error) {
            recordOpsEvent("scheduler", "weekly_report_user_failed", "error", error);
          }
        }
      });
      console.log("[CRON] Weekly reports complete.");
    } catch (err) {
      recordOpsEvent("scheduler", "weekly_reports_failed", "error", err);
      console.error("[CRON] Weekly reports error:", err.message);
    }
  }, { timezone: "UTC" });

  // ── Daily 1:00 AM: Leaderboard rebuild ────────────────────────────────────
  cron.schedule("0 1 * * *", async () => {
    console.log("[CRON] Leaderboard rebuild...");
    try {
      const runKey = `leaderboard:${new Date().toISOString().slice(0, 10)}`;
      await runScheduledOnce(runKey, () => rebuildLeaderboard("global", "weekly"));
      console.log("[CRON] Leaderboard rebuild complete.");
    } catch (err) {
      recordOpsEvent("scheduler", "leaderboard_rebuild_failed", "error", err);
      console.error("[CRON] Leaderboard rebuild error:", err.message);
    }
  });

  // ── Monday 00:01: Reset guild weekly XP ───────────────────────────────────
  cron.schedule("1 0 * * 1", async () => {
    try {
      const runKey = `guild-weekly-reset:${new Date().toISOString().slice(0, 10)}`;
      await runScheduledOnce(runKey, () => Guild.updateMany({}, { weeklyXP: 0 }));
      console.log("[CRON] Guild weekly XP reset.");
    } catch (err) {
      recordOpsEvent("scheduler", "guild_weekly_reset_failed", "error", err);
      console.error("[CRON] Guild XP reset error:", err.message);
    }
  });
};
