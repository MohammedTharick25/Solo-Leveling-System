import ScheduledRun from "./scheduledRun.model.js";

const LEASE_MS = 10 * 60 * 1000;
const RETENTION_MS = 45 * 24 * 60 * 60 * 1000;

export const runScheduledOnce = async (key, task, now = new Date()) => {
  const lockUntil = new Date(now.getTime() + LEASE_MS);
  const update = await ScheduledRun.findOneAndUpdate(
    { _id: key, completedAt: null, lockUntil: { $lte: now } },
    { $set: { lockUntil, expiresAt: new Date(now.getTime() + RETENTION_MS) } },
    { new: true },
  );

  let acquired = Boolean(update);
  if (!acquired) {
    try {
      await ScheduledRun.create({
        _id: key,
        lockUntil,
        expiresAt: new Date(now.getTime() + RETENTION_MS),
      });
      acquired = true;
    } catch (error) {
      if (error.code !== 11000) throw error;
      const existing = await ScheduledRun.findById(key).select("completedAt lockUntil").lean();
      if (existing?.completedAt) return true;
      if (!existing || existing.lockUntil > now) return false;
      // The lease expired between the failed update and the read. Try to claim it once.
      const reclaimed = await ScheduledRun.findOneAndUpdate(
        { _id: key, completedAt: null, lockUntil: { $lte: now } },
        { $set: { lockUntil, expiresAt: new Date(now.getTime() + RETENTION_MS) } },
        { new: true },
      );
      if (!reclaimed) return false;
      acquired = true;
    }
  }

  if (!acquired) return false;
  try {
    await task();
    await ScheduledRun.updateOne(
      { _id: key, lockUntil },
      { $set: { completedAt: new Date(), expiresAt: new Date(Date.now() + RETENTION_MS) }, $unset: { lockUntil: 1 } },
    );
    return true;
  } catch (error) {
    try {
      await ScheduledRun.updateOne(
        { _id: key, lockUntil },
        { $set: { lockUntil: new Date(), expiresAt: new Date(Date.now() + RETENTION_MS) } },
      );
    } catch (releaseError) {
      console.error(`[CRON] Could not release scheduled run lease: ${releaseError.name || "Error"}`);
    }
    throw error;
  }
};
