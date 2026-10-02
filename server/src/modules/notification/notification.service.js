import Notification from "./notification.model.js";
import User from "../user/user.model.js";
import { sendEmail } from "../../lib/email/mailer.js";
import { escapeEmailHtml, renderBrandedEmail } from "../../lib/email/emailLayout.js";

const CATEGORY_BY_TYPE = {
  questAssigned: "questUpdates",
  questCompleted: "questUpdates",
  questFailed: "questUpdates",
  levelUp: "progression",
  rankUp: "progression",
  shadowUnlocked: "progression",
  shadowEvolved: "progression",
  bossAppeared: "progression",
  bossDefeated: "progression",
  dungeonCompleted: "progression",
  achievementUnlocked: "progression",
  streakMilestone: "progression",
  systemWarning: "progression",
  systemUpdate: "progression",
  friendRequest: "social",
  friendAccepted: "social",
  guildInvite: "social",
  guildChallenge: "social",
  weeklyReport: "weeklyReports",
  systemAlert: "securityAlerts",
};

const getCategory = (type, metadata = {}) => {
  if (metadata?.event === "login" || metadata?.event === "password-reset") {
    return "securityAlerts";
  }
  if (type === "systemAlert") return "progression";
  return CATEGORY_BY_TYPE[type] || "progression";
};

const normalizeSettings = (settings = {}) => ({
  notifications: {
    enabled: settings.notifications?.enabled ?? true,
    inApp: settings.notifications?.inApp ?? true,
    desktop: settings.notifications?.desktop ?? false,
    email: settings.notifications?.email ?? false,
    securityAlerts: settings.notifications?.securityAlerts ?? true,
    questUpdates: settings.notifications?.questUpdates ?? true,
    progression: settings.notifications?.progression ?? true,
    social: settings.notifications?.social ?? true,
    weeklyReports: settings.notifications?.weeklyReports ?? true,
  },
});

const canDeliver = (settings, channel, category) => {
  const notifications = normalizeSettings(settings).notifications;
  return Boolean(
    notifications.enabled &&
      notifications[channel] &&
      notifications[category],
  );
};

const buildEmail = ({ title, message, metadata = {} }) => {
  const details = Object.entries(metadata || {})
    .filter(([key, value]) => value !== undefined && value !== null && typeof value !== "object")
    .slice(0, 8)
    .map(([key, value]) => `<tr><td style="padding:9px 12px;border-bottom:1px solid #172235;color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:11px">${escapeEmailHtml(key)}</td><td align="right" style="padding:9px 12px;border-bottom:1px solid #172235;color:#cbd5e1;font-family:Arial,Helvetica,sans-serif;font-size:12px">${escapeEmailHtml(value)}</td></tr>`)
    .join("");
  const detailsTable = details
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;background-color:#070d18;border:1px solid #1e293b;border-radius:9px;overflow:hidden">${details}</table>`
    : "";

  return {
    subject: `Solo Leveling — ${title}`,
    text: `${title}\n\n${message}${details ? `\n\n${Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join("\n")}` : ""}`,
    html: renderBrandedEmail({
      preheader: message,
      eyebrow: "SYSTEM UPDATE",
      title,
      content: `<p style="margin:0;color:#cbd5e1;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75">${escapeEmailHtml(message)}</p>${detailsTable}`,
      footer: "You received this message because email notifications are enabled for your account.",
    }),
  };
};

/**
 * Creates an in-app notification and delivers optional email/socket channels
 * according to the user's server-side notification settings.
 */
export const createNotification = async (
  userId,
  type,
  title,
  message,
  metadata = {},
  io = null,
) => {
  const user = await User.findById(userId).select("email hunterName settings isActive");
  if (!user || !user.isActive) return null;

  const category = getCategory(type, metadata);
  const settings = normalizeSettings(user.settings).notifications;
  if (!settings.enabled || !settings[category]) return null;

  const shouldStore = settings.inApp;
  const shouldEmail = settings.email;
  const shouldSocket = settings.inApp || settings.desktop;

  let notification = null;
  if (shouldStore) {
    notification = await Notification.create({
      userId,
      type,
      title,
      message,
      metadata,
    });
  }

  const payload = notification?.toObject?.() || {
    _id: `transient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type,
    title,
    message,
    metadata,
    isRead: false,
    createdAt: new Date(),
    transient: true,
  };

  if (io && shouldSocket) {
    io.to(`user:${userId}`).emit("notification:new", payload);
  }

  if (shouldEmail) {
    try {
      await sendEmail({ to: user.email, ...buildEmail({ title, message, metadata }) });
    } catch (error) {
      console.error(`[EMAIL] Notification failed for ${user.email}:`, error.message);
    }
  }

  return notification;
};

export const getNotifications = async (userId, page = 1, limit = 20) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (safePage - 1) * safeLimit;
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    Notification.countDocuments({ userId, isRead: false }),
  ]);
  return { notifications, unreadCount, page: safePage, limit: safeLimit };
};

export const markAsRead = async (notificationId, userId) =>
  Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true },
  );

export const markAllAsRead = async (userId) =>
  Notification.updateMany({ userId, isRead: false }, { isRead: true });

export const clearNotifications = async (userId) =>
  Notification.deleteMany({ userId });

export { CATEGORY_BY_TYPE, getCategory };
