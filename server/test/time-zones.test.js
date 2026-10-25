import test from "node:test";
import assert from "node:assert/strict";
import {
  getZonedDayBounds,
  getZonedDayBoundsForKey,
  getZonedDateKey,
  isValidTimeZone,
  normalizeTimeZone,
} from "../src/lib/timeZones.js";

test("timezone day bounds follow local midnight", () => {
  const bounds = getZonedDayBounds(new Date("2026-10-25T12:00:00.000Z"), "Asia/Kolkata");
  assert.equal(bounds.start.toISOString(), "2026-10-24T18:30:00.000Z");
  assert.equal(getZonedDateKey(bounds.start, "Asia/Kolkata"), "2026-10-25");
  assert.equal(bounds.end.getTime() - bounds.start.getTime() + 1, 24 * 60 * 60 * 1000);
});

test("timezone day bounds account for daylight saving transitions", () => {
  const spring = getZonedDayBounds(new Date("2026-03-08T12:00:00.000Z"), "America/Los_Angeles");
  const fall = getZonedDayBounds(new Date("2026-11-01T12:00:00.000Z"), "America/Los_Angeles");
  assert.equal(spring.end.getTime() - spring.start.getTime() + 1, 23 * 60 * 60 * 1000);
  assert.equal(fall.end.getTime() - fall.start.getTime() + 1, 25 * 60 * 60 * 1000);
});

test("date-only keys keep their intended calendar date west of UTC", () => {
  const bounds = getZonedDayBoundsForKey("2026-10-25", "America/Los_Angeles");
  assert.equal(bounds.start.toISOString(), "2026-10-25T07:00:00.000Z");
  assert.equal(getZonedDateKey(bounds.start, "America/Los_Angeles"), "2026-10-25");
});

test("invalid timezone values safely fall back to UTC", () => {
  assert.equal(isValidTimeZone("not/a-timezone"), false);
  assert.equal(normalizeTimeZone("not/a-timezone"), "UTC");
});
