import webPush from "web-push";
import config from "../../config/env.js";
import User from "../user/user.model.js";
import Hunter from "../hunter/hunter.model.js";

const configured = Boolean(config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY);
if (configured) {
  webPush.setVapidDetails(config.VAPID_SUBJECT, config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY);
}

export const getPublicKey = () => config.VAPID_PUBLIC_KEY || null;

export const saveSubscription = async (userId, { subscription, timeZone, time }) => {
  if (!configured) throw Object.assign(new Error("Device reminders are not configured on this server."), { statusCode: 503 });
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  user.pushSubscriptions = (user.pushSubscriptions || []).filter((item) => item.endpoint !== subscription.endpoint);
  user.pushSubscriptions.push(subscription);
  if (timeZone && isValidTimeZone(timeZone)) user.timezone = timeZone;
  user.settings.notifications.streakReminderEnabled = true;
  user.settings.notifications.streakReminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")
    ? time
    : user.settings.notifications.streakReminderTime || "19:00";
  await user.save({ validateBeforeSave: false });
  return user.settings.notifications;
};

export const updateReminder = async (userId, { enabled, time }) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  if (enabled && (!configured || !user.pushSubscriptions?.length)) {
    throw Object.assign(new Error("Connect this device before enabling reminders."), { statusCode: 400 });
  }
  user.settings.notifications.streakReminderEnabled = enabled;
  user.settings.notifications.streakReminderTime = time;
  await user.save({ validateBeforeSave: false });
  return user.settings.notifications;
};

export const removeSubscription = async (userId, endpoint) => {
  await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint } } });
  const user = await User.findById(userId).select("pushSubscriptions");
  if (user && !user.pushSubscriptions.length) {
    await User.updateOne({ _id: userId }, { $set: { "settings.notifications.streakReminderEnabled": false } });
  }
};

const isValidTimeZone = (timeZone) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
};

const localClock = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: isValidTimeZone(timeZone) ? timeZone : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const dateValues = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  return {
    time: `${values.hour}:${values.minute}`,
    date: `${dateValues.year}-${dateValues.month}-${dateValues.day}`,
  };
};

export const sendDueStreakReminders = async (now = new Date()) => {
  if (!configured) return { sent: 0, skipped: 0 };
  const users = await User.find({
    isActive: true,
    "settings.notifications.enabled": true,
    "settings.notifications.progression": true,
    "settings.notifications.streakReminderEnabled": true,
    "pushSubscriptions.0": { $exists: true },
  }).select("_id timezone settings.notifications pushSubscriptions lastStreakReminderDate");
  if (!users.length) return { sent: 0, skipped: 0 };

  const hunters = await Hunter.find({ userId: { $in: users.map((user) => user._id) } })
    .select("userId currentStreak lastActiveDate")
    .lean();
  const huntersByUserId = new Map(hunters.map((hunter) => [hunter.userId.toString(), hunter]));
  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const { date, time } = localClock(now, user.timezone);
    if (time !== user.settings.notifications.streakReminderTime || user.lastStreakReminderDate === date) {
      skipped += 1;
      continue;
    }
    const hunter = huntersByUserId.get(user._id.toString());
    if (hunter?.lastActiveDate && localClock(hunter.lastActiveDate, user.timezone).date === date) {
      user.lastStreakReminderDate = date;
      await user.save({ validateBeforeSave: false });
      skipped += 1;
      continue;
    }

    user.lastStreakReminderDate = date;
    await user.save({ validateBeforeSave: false });
    const payload = JSON.stringify({
      title: "Your daily streak is waiting",
      body: "Choose one small quest and make today count. Coming back is always a win.",
      url: "/quests",
      tag: `streak-reminder-${date}`,
      type: "streakReminder",
      streak: hunter?.currentStreak || 0,
    });
    for (const subscription of user.pushSubscriptions) {
      try {
        await webPush.sendNotification(subscription, payload, { TTL: 60 * 60 });
        sent += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          user.pushSubscriptions = user.pushSubscriptions.filter((item) => item.endpoint !== subscription.endpoint);
          await user.save({ validateBeforeSave: false });
        } else {
          console.error(`[PUSH] Streak reminder failed for ${user._id}:`, error.message);
        }
      }
    }
  }
  return { sent, skipped };
};