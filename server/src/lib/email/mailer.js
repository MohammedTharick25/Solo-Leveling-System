import config from "../../config/env.js";

const RESEND_API_URL = "https://api.resend.com/emails";

const normalizeRecipient = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return value ? [String(value)] : [];
};

const parseProviderError = (payload, status) => {
  if (payload?.message) return payload.message;
  if (payload?.error?.message) return payload.error.message;
  if (payload?.name) return payload.name;
  return `Email API request failed with status ${status}.`;
};

/**
 * Sends transactional email through Resend's HTTPS API.
 *
 * This intentionally does not use SMTP. It works on hosting platforms where
 * outbound SMTP ports are restricted because the provider is reached over
 * normal HTTPS (443).
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!config.RESEND_API_KEY) {
    throw new Error("Email service is not configured. Set RESEND_API_KEY.");
  }

  const recipients = normalizeRecipient(to);
  if (!recipients.length) {
    throw new Error("Email recipient is required.");
  }

  if (!config.EMAIL_FROM) {
    throw new Error("Email sender is not configured. Set EMAIL_FROM.");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: recipients,
      subject: String(subject || "Solo Leveling System"),
      html: html || undefined,
      text: text || undefined,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const providerMessage = parseProviderError(payload, response.status);
    const error = new Error(`Email API error: ${providerMessage}`);
    error.statusCode = response.status;
    error.provider = "resend";
    throw error;
  }

  return payload;
};

export const isEmailConfigured = () => Boolean(config.RESEND_API_KEY && config.EMAIL_FROM);
