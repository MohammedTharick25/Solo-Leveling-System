import cron from "node-cron";
import User from "../../modules/user/user.model.js";
import Quest from "../../modules/quest/quest.model.js";
import Guild from "../../modules/guild/guild.model.js";
import { generateQuestsForUser } from "../../modules/quest/quest.service.js";
import { computeAndSaveStats } from "../../modules/stats/stats.service.js";
import { generateWeeklyReport } from "../../modules/report/report.routes.js";
import { rebuildLeaderboard } from "../../modules/leaderboard/leaderboard.routes.js";
import { checkAndUpdateStreaks } from "../../modules/hunter/hunter.service.js";
import { recordDailySnapshot } from "../../modules/analytics/analytics.routes.js";

export const startCronJobs = (io) => {
  console.log("[CRON] Scheduler started");

  // ── Midnight: check streaks FIRST, then expire old quests ─────────────────
  // Run at 00:01 so the day has clearly rolled over
  cron.schedule("1 0 * * *", async () => {
    console.log("[CRON] Midnight streak check...");
    try {
      const users = await User.find({ isActive: true, isAwakened: true })
        .select("_id")
        .lean();
      for (const user of users) {
        try {
          await checkAndUpdateStreaks(user._id, io);
        } catch (err) {
          console.error(
            `[CRON] Streak check failed for ${user._id}: ${err.message}`,
          );
        }
      }
      console.log(`[CRON] Streak check complete for ${users.length} users.`);
    } catch (err) {
      console.error("[CRON] Streak check error:", err.message);
    }
  });

  // ── Expire active quests from previous days at 00:02 ──────────────────────
  cron.schedule("2 0 * * *", async () => {
    console.log("[CRON] Expiring old quests...");
    try {
      const yesterday = new Date();
      yesterday.setHours(0, 0, 0, 0); // start of today = end of yesterday
      const result = await Quest.updateMany(
        { status: "active", dueAt: { $lt: yesterday } },
        { status: "expired" },
      );
      console.log(`[CRON] Expired ${result.modifiedCount} quests.`);
    } catch (err) {
      console.error("[CRON] Quest expiry error:", err.message);
    }
  });

  // ── 6:00 AM: Generate today's 5 daily quests for every user ───────────────
  cron.schedule("0 6 * * *", async () => {
    console.log("[CRON] Daily quest generation...");
    try {
      const users = await User.find({ isActive: true, isAwakened: true })
        .select("_id")
        .lean();
      let totalGenerated = 0;
      for (const user of users) {
        try {
          const quests = await generateQuestsForUser(user._id, io);
          totalGenerated += quests.length;
        } catch (err) {
          console.error(
            `[CRON] Quest gen failed for ${user._id}: ${err.message}`,
          );
        }
      }
      console.log(
        `[CRON] Generated ${totalGenerated} quests for ${users.length} users.`,
      );
    } catch (err) {
      console.error("[CRON] Quest generation error:", err.message);
    }
  });

  // ── Every 4 hours: recompute productivity stats ────────────────────────────
  cron.schedule("0 */4 * * *", async () => {
    console.log("[CRON] Stats recompute...");
    try {
      const users = await User.find({ isActive: true }).select("_id").lean();
      for (const user of users) {
        try {
          await computeAndSaveStats(user._id);
        } catch {}
      }
      console.log("[CRON] Stats recompute complete.");
    } catch (err) {
      console.error("[CRON] Stats recompute error:", err.message);
    }
  });

  // ── 11:55 PM: Daily analytics snapshot ────────────────────────────────────
  cron.schedule("55 23 * * *", async () => {
    console.log("[CRON] Analytics snapshot...");
    try {
      const users = await User.find({ isActive: true }).select("_id").lean();
      for (const user of users) {
        try {
          await recordDailySnapshot(user._id);
        } catch {}
      }
      console.log("[CRON] Analytics snapshot complete.");
    } catch (err) {
      console.error("[CRON] Analytics snapshot error:", err.message);
    }
  });

  // ── Sunday 00:05: Generate weekly Hunter Reports ──────────────────────────
  cron.schedule("5 0 * * 0", async () => {
    console.log("[CRON] Weekly reports...");
    try {
      const users = await User.find({ isActive: true, isAwakened: true })
        .select("_id")
        .lean();
      for (const user of users) {
        try {
          await generateWeeklyReport(user._id, io);
        } catch {}
      }
      console.log("[CRON] Weekly reports complete.");
    } catch (err) {
      console.error("[CRON] Weekly reports error:", err.message);
    }
  });

  // ── Daily 1:00 AM: Leaderboard rebuild ────────────────────────────────────
  cron.schedule("0 1 * * *", async () => {
    console.log("[CRON] Leaderboard rebuild...");
    try {
      await rebuildLeaderboard("global", "weekly");
      console.log("[CRON] Leaderboard rebuild complete.");
    } catch (err) {
      console.error("[CRON] Leaderboard rebuild error:", err.message);
    }
  });

  // ── Monday 00:01: Reset guild weekly XP ───────────────────────────────────
  cron.schedule("1 0 * * 1", async () => {
    try {
      await Guild.updateMany({}, { weeklyXP: 0 });
      console.log("[CRON] Guild weekly XP reset.");
    } catch (err) {
      console.error("[CRON] Guild XP reset error:", err.message);
    }
  });
};
