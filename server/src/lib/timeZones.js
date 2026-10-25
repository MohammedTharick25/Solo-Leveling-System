const formatterCache = new Map();

export const isValidTimeZone = (timeZone) => {
  if (typeof timeZone !== "string" || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timeZone.trim() });
    return true;
  } catch {
    return false;
  }
};

export const normalizeTimeZone = (timeZone) =>
  isValidTimeZone(timeZone) ? timeZone.trim() : "UTC";

const getFormatter = (timeZone) => {
  const zone = normalizeTimeZone(timeZone);
  if (!formatterCache.has(zone)) {
    formatterCache.set(zone, new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }));
  }
  return formatterCache.get(zone);
};

export const getZonedDateTimeParts = (date = new Date(), timeZone = "UTC") => {
  const parts = Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
};

export const getZonedDateKey = (date = new Date(), timeZone = "UTC") => {
  const { year, month, day } = getZonedDateTimeParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const getZonedWeekday = (date = new Date(), timeZone = "UTC") => {
  const { year, month, day } = getZonedDateTimeParts(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const zonedMidnightToUtc = ({ year, month, day }, timeZone) => {
  const targetWallTime = Date.UTC(year, month - 1, day, 0, 0, 0);
  let candidate = targetWallTime;

  // Iterate the zone offset at the candidate instant. This handles DST days
  // without assuming a local day is always exactly 24 hours long.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const local = getZonedDateTimeParts(new Date(candidate), timeZone);
    const representedWallTime = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const adjustment = targetWallTime - representedWallTime;
    if (adjustment === 0) break;
    candidate += adjustment;
  }
  return new Date(candidate);
};

const shiftCalendarDate = ({ year, month, day }, amount) => {
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
};

export const getZonedDayBounds = (date = new Date(), timeZone = "UTC") => {
  const zone = normalizeTimeZone(timeZone);
  const localDate = getZonedDateTimeParts(date, zone);
  const start = zonedMidnightToUtc(localDate, zone);
  const nextStart = zonedMidnightToUtc(shiftCalendarDate(localDate, 1), zone);
  return { start, end: new Date(nextStart.getTime() - 1) };
};

export const getZonedDayBoundsForKey = (dateKey, timeZone = "UTC") => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return getZonedDayBounds(new Date(dateKey), timeZone);
  const localDate = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const zone = normalizeTimeZone(timeZone);
  const start = zonedMidnightToUtc(localDate, zone);
  const nextDate = shiftCalendarDate(localDate, 1);
  const nextStart = zonedMidnightToUtc(nextDate, zone);
  return { start, end: new Date(nextStart.getTime() - 1) };
};

export const getZonedYearBounds = (year, timeZone = "UTC") => {
  const zone = normalizeTimeZone(timeZone);
  const start = zonedMidnightToUtc({ year: Number(year), month: 1, day: 1 }, zone);
  const nextStart = zonedMidnightToUtc({ year: Number(year) + 1, month: 1, day: 1 }, zone);
  return { start, end: new Date(nextStart.getTime() - 1) };
};

export const getZonedCalendarDay = (date, amount, timeZone = "UTC") => {
  const parts = getZonedDateTimeParts(date, timeZone);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return getZonedDayBounds(shifted, timeZone);
};
