import dotenv from "dotenv";
dotenv.config();

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/solo-leveling",

  JWT_SECRET: process.env.JWT_SECRET || "change-this-secret-in-production",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    "change-this-refresh-secret-in-production",
  JWT_ACCESS_EXPIRY: "7d",
  JWT_REFRESH_EXPIRY: "7d",

  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_MAX: 100,

  CLOUDINARY_NAME:process.env.CLOUDINARY_NAME,
  CLOUDINARY_KEY:process.env.CLOUDINARY_KEY,
  CLOUDINARY_SECRET:process.env.CLOUDINARY_SECRET,

  BCRYPT_ROUNDS: 12,
};

export default config;
