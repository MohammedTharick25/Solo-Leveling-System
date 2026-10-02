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
    minuteOfDay: Number(values.hour) * 60 + Number(values.minute),
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
    const local = localClock(now, user.timezone);
    const [reminderHour, reminderMinute] = (user.settings.notifications.streakReminderTime || "19:00").split(":").map(Number);
    const minutesLate = local.minuteOfDay - (reminderHour * 60 + reminderMinute);
    if (minutesLate < 0 || minutesLate > 20 || user.lastStreakReminderDate === local.date) {
      skipped += 1;
      continue;
    }
    const hunter = huntersByUserId.get(user._id.toString());
    if (hunter?.currentStreak > 0 && hunter.lastActiveDate && localClock(hunter.lastActiveDate, user.timezone).date === local.date) {
      await User.updateOne(
        { _id: user._id, lastStreakReminderDate: { $ne: local.date } },
        { $set: { lastStreakReminderDate: local.date } },
      );
      skipped += 1;
      continue;
    }

    const claimedUser = await User.findOneAndUpdate(
      { _id: user._id, lastStreakReminderDate: { $ne: local.date } },
      { $set: { lastStreakReminderDate: local.date } },
      { new: true },
    ).select("pushSubscriptions");
    if (!claimedUser) {
      skipped += 1;
      continue;
    }
    const payload = JSON.stringify({
      title: "Your daily streak is waiting",
      body: "Choose one small quest and make today count. Coming back is always a win.",
      url: "/quests",
      tag: `streak-reminder-${local.date}`,
      type: "streakReminder",
      streak: hunter?.currentStreak || 0,
    });
    let delivered = 0;
    for (const subscription of claimedUser.pushSubscriptions) {
      try {
        await webPush.sendNotification(subscription, payload, { TTL: 60 * 60 });
        sent += 1;
        delivered += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await User.updateOne({ _id: user._id }, { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } });
        } else {
          console.error(`[PUSH] Streak reminder failed for ${user._id}:`, error.message);
        }
      }
    }
    if (!delivered) {
      await User.updateOne(
        { _id: user._id, lastStreakReminderDate: local.date },
        { $unset: { lastStreakReminderDate: 1 } },
      );
    }
  }
  return { sent, skipped };
};

export const sendTestNotification = async (userId, endpoint) => {
  if (!configured) {
    throw Object.assign(new Error("Push is not configured on the server. Check its VAPID keys."), { statusCode: 503 });
  }
  const user = await User.findById(userId).select("pushSubscriptions");
  if (!user) throw Object.assign(new Error("User not found."), { statusCode: 404 });
  const subscription = user.pushSubscriptions.find((item) => item.endpoint === endpoint);
  if (!subscription) {
    throw Object.assign(new Error("This device is not subscribed. Connect it again and retry."), { statusCode: 404 });
  }

  try {
    await webPush.sendNotification(subscription, JSON.stringify({
      title: "Push test received",
      body: "This device can receive notifications from The System.",
      url: "/settings",
      tag: `push-test-${Date.now()}`,
      type: "pushTest",
    }), { TTL: 60 });
    return { delivered: true };
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint } } });
      throw Object.assign(new Error("This device subscription expired. Disconnect and reconnect the device."), { statusCode: 410 });
    }
    if (error.statusCode === 401 || error.statusCode === 403) {
      console.error(`[PUSH] Test send rejected by push provider (${error.statusCode}).`);
      throw Object.assign(new Error("The push provider rejected the server's VAPID credentials. Verify the VAPID keys match the subscription."), { statusCode: 502 });
    }
    console.error(`[PUSH] Test send failed with status ${error.statusCode || "unknown"}.`);
    throw Object.assign(new Error(`The push provider could not accept the test notification${error.statusCode ? ` (${error.statusCode})` : ""}.`), { statusCode: 502 });
  }
};