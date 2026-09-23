import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(__dirname, "../../modules/auth/templates");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const render = async (fileName, values) => {
  let html = await fs.readFile(path.join(templateDir, fileName), "utf8");
  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value));
  }
  return html;
};

export const passwordResetEmail = async ({ hunterName, resetUrl, expiresMinutes }) => ({
  subject: "Reset your Solo Leveling password",
  text: `Hunter ${hunterName},\n\nA password reset was requested for your Solo Leveling account. Use this link within ${expiresMinutes} minutes:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
  html: await render("password-reset.html", { hunterName, resetUrl, expiresMinutes }),
});

export const loginNotificationEmail = async ({ hunterName, device, browser, os, ip, time }) => ({
  subject: "New login detected on your Solo Leveling account",
  text: `Hunter ${hunterName},\n\nA new login was detected.\nDevice: ${device}\nBrowser: ${browser}\nOS: ${os}\nIP: ${ip}\nTime: ${time}\n\nIf this was not you, reset your password immediately.`,
  html: await render("login-alert.html", { hunterName, device, browser, os, ip, time }),
});
