import assert from "node:assert/strict";
import test from "node:test";
import ScheduledRun from "../src/infrastructure/scheduler/scheduledRun.model.js";
import { runScheduledOnce } from "../src/infrastructure/scheduler/runScheduledOnce.js";

test("scheduled runs are shared, retryable, and only completed once", async (t) => {
  const originals = {
    findOneAndUpdate: ScheduledRun.findOneAndUpdate,
    create: ScheduledRun.create,
    findById: ScheduledRun.findById,
    updateOne: ScheduledRun.updateOne,
  };
  t.after(() => {
    ScheduledRun.findOneAndUpdate = originals.findOneAndUpdate;
    ScheduledRun.create = originals.create;
    ScheduledRun.findById = originals.findById;
    ScheduledRun.updateOne = originals.updateOne;
  });

  const now = new Date("2026-10-25T12:00:00.000Z");
  const state = { lockUntil: null, completedAt: null };
  ScheduledRun.findOneAndUpdate = async (filter, update) => {
    if (state.completedAt || (state.lockUntil && state.lockUntil > filter.lockUntil.$lte)) return null;
    state.lockUntil = update.$set.lockUntil;
    return { _id: filter._id };
  };
  ScheduledRun.create = async () => {
    const error = new Error("duplicate scheduled run key");
    error.code = 11000;
    throw error;
  };
  ScheduledRun.findById = () => ({
    select: () => ({ lean: async () => ({ ...state }) }),
  });
  ScheduledRun.updateOne = async (_filter, update) => {
    if (update.$set.completedAt) state.completedAt = update.$set.completedAt;
    if (update.$unset?.lockUntil) state.lockUntil = null;
  };

  state.lockUntil = new Date(now.getTime() + 60_000);
  let taskRuns = 0;
  assert.equal(await runScheduledOnce("test:busy", async () => { taskRuns += 1; }, now), false);
  assert.equal(taskRuns, 0);

  state.lockUntil = null;
  assert.equal(await runScheduledOnce("test:busy", async () => { taskRuns += 1; }, now), true);
  assert.equal(taskRuns, 1);
  assert.equal(await runScheduledOnce("test:busy", async () => { taskRuns += 1; }, now), true);
  assert.equal(taskRuns, 1);
});
