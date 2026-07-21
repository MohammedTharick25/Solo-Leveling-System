import cron from "node-cron";
import { sweepExpiredChallenges } from "./guild.service.js";

/**
 * Call this once from your server entrypoint (e.g. server.js / index.js),
 * after your Socket.IO `io` instance is created:
 *
 *   import { startGuildChallengeExpiryCron } from "./modules/guild/guild.cron.js";
 *   startGuildChallengeExpiryCron(io);
 *
 * Runs every 5 minutes. Adjust the cron expression as needed.
 */
export const startGuildChallengeExpiryCron = (io) => {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const result = await sweepExpiredChallenges(io);
      if (result.challengesExpired > 0) {
        console.log(
          `[guild-cron] Expired ${result.challengesExpired} challenge(s) across ${result.guildsSwept} guild(s).`,
        );
      }
    } catch (err) {
      console.error("[guild-cron] sweepExpiredChallenges failed:", err);
    }
  });
};

/**
 * setInterval fallback if you don't want to add the node-cron dependency.
 * Call this instead of startGuildChallengeExpiryCron.
 */
export const startGuildChallengeExpiryInterval = (
  io,
  intervalMs = 5 * 60 * 1000,
) => {
  setInterval(async () => {
    try {
      const result = await sweepExpiredChallenges(io);
      if (result.challengesExpired > 0) {
        console.log(
          `[guild-cron] Expired ${result.challengesExpired} challenge(s) across ${result.guildsSwept} guild(s).`,
        );
      }
    } catch (err) {
      console.error("[guild-cron] sweepExpiredChallenges failed:", err);
    }
  }, intervalMs);
};
