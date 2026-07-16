import { validationResult } from "express-validator";
import { sendError } from "../lib/helpers.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`);
    return sendError(res, messages.join(". "), 400, errors.array());
  }
  next();
};
