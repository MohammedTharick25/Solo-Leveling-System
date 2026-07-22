import { Router } from "express";
import { body } from "express-validator";
import userController from "./user.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";

const router = Router();

// All routes are protected
router.use(protect);

router.get("/me", userController.getMe);

router.patch(
  "/me",
  [
    body("country").optional().isString(),
    body("timezone").optional().isString(),
    validate,
  ],
  userController.updateMe,
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
  userController.updatePassword,
);

router.delete("/me", userController.deleteMe);

export default router;
