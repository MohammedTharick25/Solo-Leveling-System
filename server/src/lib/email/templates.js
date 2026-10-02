import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { escapeEmailHtml, renderBrandedEmail, renderEmailButton } from "./emailLayout.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(__dirname, "../../modules/auth/templates");

const render = async (fileName, values) => {
  let html = await fs.readFile(path.join(templateDir, fileName), "utf8");
  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, escapeEmailHtml(value));
  }
  return html;
};

export const passwordResetEmail = async ({ hunterName, resetUrl, expiresMinutes }) => {
  const contentTemplate = await render("password-reset.html", {
    hunterName,
    expiresMinutes,
    resetUrl,
  });
  const content = contentTemplate.replaceAll("{{resetButton}}", renderEmailButton(resetUrl, "Reset my password"));
  return {
    subject: "Reset your Solo Leveling password",
    text: `Hunter ${hunterName},\n\nA password reset was requested for your Solo Leveling account. Use this link within ${expiresMinutes} minutes:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    html: renderBrandedEmail({
      preheader: `Your secure password reset link expires in ${expiresMinutes} minutes.`,
      eyebrow: "ACCOUNT SECURITY",
      title: "Reset your password",
      content,
      footer: "If you did not request a password reset, you can safely ignore this email. Your password will not change unless you use the secure link above.",
    }),
  };
};

export const loginNotificationEmail = async ({ hunterName, device, browser, os, ip, time }) => {
  const content = await render("login-alert.html", { hunterName, device, browser, os, ip, time });
  return {
    subject: "New login detected on your Solo Leveling account",
    text: `Hunter ${hunterName},\n\nA new login was detected.\nDevice: ${device}\nBrowser: ${browser}\nOS: ${os}\nIP: ${ip}\nTime: ${time}\n\nIf this was not you, reset your password immediately.`,
    html: renderBrandedEmail({
      preheader: `A new login to your account was detected at ${time}.`,
      eyebrow: "SECURITY ACTIVITY",
      title: "New login detected",
      content,
      footer: "If you do not recognize this activity, change your password immediately and review your active sessions.",
    }),
  };
};
