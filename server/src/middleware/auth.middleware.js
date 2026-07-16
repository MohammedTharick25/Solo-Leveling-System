import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User from "../modules/user/user.model.js";
import { sendError } from "../lib/helpers.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "Access denied. No token provided.", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      return sendError(res, "User not found or deactivated.", 401);
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, "Token expired. Please refresh.", 401);
    }
    if (err.name === "JsonWebTokenError") {
      return sendError(res, "Invalid token.", 401);
    }
    next(err);
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return sendError(res, "Admin access required.", 403);
  }
  next();
};

export const requireAwakened = (req, res, next) => {
  if (!req.user?.isAwakened) {
    return sendError(res, "Complete your Awakening first.", 403);
  }
  next();
};
