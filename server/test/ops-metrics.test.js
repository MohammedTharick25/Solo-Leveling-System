import assert from "node:assert/strict";
import test from "node:test";
import { getOpsMetrics, recordOpsEvent } from "../src/lib/opsMetrics.js";

test("operational metrics count events without exposing error messages", (t) => {
  const originalError = console.error;
  const originalInfo = console.info;
  console.error = () => {};
  console.info = () => {};
  t.after(() => {
    console.error = originalError;
    console.info = originalInfo;
  });

  const before = getOpsMetrics();
  recordOpsEvent("scheduler", "test_failure", "error", Object.assign(new Error("private detail"), { code: "E_TEST" }));
  recordOpsEvent("ai", "test_fallback", "fallback");
  const after = getOpsMetrics();

  assert.equal(after.counters.schedulerFailures, before.counters.schedulerFailures + 1);
  assert.equal(after.counters.aiQuestFallbacks, before.counters.aiQuestFallbacks + 1);
  const failedEvent = after.recentEvents.find((event) => event.event === "test_failure");
  assert.equal(failedEvent.errorCode, "E_TEST");
  assert.equal("message" in failedEvent, false);
  assert.equal(JSON.stringify(after).includes("private detail"), false);
  assert.ok(after.recentEvents.length <= 30);
});
