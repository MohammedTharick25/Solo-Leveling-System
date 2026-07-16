import User from "./user.model.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

const router = Router();
router.use(protect);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    sendSuccess(res, { user: req.user }, "Profile retrieved.");
  }),
);

router.patch(
  "/me",
  [
    body("country").optional().isString(),
    body("timezone").optional().isString(),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const allowed = ["country", "timezone"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k)),
    );
    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    });
    sendSuccess(res, { user: user.toSafeObject() }, "Profile updated.");
  }),
);

router.patch(
  "/me/password",
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters"),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select("+password");
    const isMatch = await user.comparePassword(req.body.currentPassword);
    if (!isMatch) throw new AppError("Current password is incorrect.", 401);

    user.password = req.body.newPassword;
    await user.save();
    sendSuccess(res, {}, "Password updated successfully.");
  }),
);

router.delete(
  "/me",
  asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.userId, { isActive: false });
    sendSuccess(res, {}, "Account deactivated.");
  }),
);

export default router;
