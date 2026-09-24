import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: { type: Boolean, default: false },
    device: { type: String, default: "Desktop" },
    deviceName: { type: String, default: "Unknown device" },
    browser: { type: String, default: "Unknown browser" },
    os: { type: String, default: "Unknown OS" },
    ipAddress: { type: String, default: "Unknown" },
    userAgent: { type: String, default: "" },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });

export default mongoose.model("RefreshToken", refreshTokenSchema);
