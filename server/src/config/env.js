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

  CLOUDINARY_NAME:process.env.CLOUDINARY_NAME,
  CLOUDINARY_KEY:process.env.CLOUDINARY_KEY,
  CLOUDINARY_SECRET:process.env.CLOUDINARY_SECRET,

  BCRYPT_ROUNDS: 12,

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_SECURE: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || "Solo Leveling <no-reply@localhost>",
  PASSWORD_RESET_EXPIRY_MINUTES: parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES, 10) || 30,
};

export default config;
