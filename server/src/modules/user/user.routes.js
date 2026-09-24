import { Router } from "express";
import { body } from "express-validator";
import userController from "./user.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { upload } from "../../lib/cloudinary.js";

const router = Router();
router.use(protect);

router.get("/me", userController.getMe);
router.get("/me/settings", userController.getSettings);
router.get("/me/export", userController.exportMe);
router.get("/me/sessions", userController.getSessions);
router.delete("/me/sessions/:sessionId", userController.revokeSession);

router.patch(
  "/me",
  [
    body("country").optional().isString().isLength({ max: 80 }),
    body("timezone").optional().isString().isLength({ max: 100 }),
    body("bio").optional().isString().isLength({ max: 240 }),
    body("hunterName")
      .optional()
      .matches(/^[a-zA-Z0-9_]{3,20}$/)
      .withMessage("Hunter name must be 3-20 chars, letters/numbers/underscores only"),
    validate,
  ],
  userController.updateMe,
);

router.patch("/me/settings", userController.updateSettings);

router.delete("/me/avatar", userController.removeAvatar);

router.patch(
  "/me/avatar",
  upload.single("avatar"),
  userController.updateAvatar,
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

router.post("/me/logout-all", userController.logoutAllDevices);

router.post(
  "/me/deactivate",
  [body("password").optional().isString(), validate],
  userController.deactivateMe,
);

router.delete(
  "/me",
  [body("password").notEmpty().withMessage("Password is required to permanently delete the account"), validate],
  userController.deleteMe,
);

export default router;
