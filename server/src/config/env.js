import dotenv from "dotenv";
dotenv.config();

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  PRODUCTION_URL: process.env.PRODUCTION_URL,

  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/solo-leveling",

  JWT_SECRET: process.env.JWT_SECRET || "change-this-secret-in-production",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    "change-this-refresh-secret-in-production",
  JWT_ACCESS_EXPIRY: "7d",
  JWT_REFRESH_EXPIRY: "30d",

  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_MAX: 100,

  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
  CLOUDINARY_KEY: process.env.CLOUDINARY_KEY,
  CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRET,

  BCRYPT_ROUNDS: 12,

  // Transactional email is sent through Resend's HTTPS API instead of SMTP.
  // This is compatible with hosting platforms that restrict outbound SMTP ports.
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  PASSWORD_RESET_EXPIRY_MINUTES:
    parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 30,

  // AI uses the Groq free tier. No paid SDK is required; Node's native fetch
  // calls the OpenAI-compatible endpoint directly. If no key is configured,
  // the System falls back to deterministic local coaching.
  AI_PROVIDER: process.env.AI_PROVIDER || "groq",
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  AI_MAX_OUTPUT_TOKENS: parseInt(process.env.AI_MAX_OUTPUT_TOKENS, 10) || 700,
};

export default config;
