import RefreshToken from "./auth.model.js";

export const saveRefreshToken = async (userId, token, expiresAt) => {
  return RefreshToken.create({ userId, token, expiresAt });
};

export const findRefreshToken = async (token) => {
  return RefreshToken.findOne({ token, isRevoked: false });
};

export const revokeRefreshToken = async (token) => {
  return RefreshToken.findOneAndUpdate({ token }, { isRevoked: true });
};

export const revokeAllUserTokens = async (userId) => {
  return RefreshToken.updateMany({ userId }, { isRevoked: true });
};

export const cleanExpiredTokens = async () => {
  return RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
};
