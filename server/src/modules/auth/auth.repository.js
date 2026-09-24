import RefreshToken from "./auth.model.js";

export const saveRefreshToken = async (userId, token, expiresAt, metadata = {}) => {
  return RefreshToken.create({
    userId,
    token,
    expiresAt,
    sessionId: metadata.sessionId,
    device: metadata.device,
    deviceName: metadata.deviceName,
    browser: metadata.browser,
    os: metadata.os,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    lastUsedAt: metadata.lastUsedAt || new Date(),
  });
};

export const findRefreshToken = async (token) =>
  RefreshToken.findOne({ token, isRevoked: false });

export const revokeRefreshToken = async (token) =>
  RefreshToken.findOneAndUpdate({ token }, { isRevoked: true });

export const revokeAllUserTokens = async (userId) =>
  RefreshToken.updateMany({ userId }, { isRevoked: true });

export const cleanExpiredTokens = async () =>
  RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });

export const revokeAllRefreshTokens = (userId) =>
  RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
