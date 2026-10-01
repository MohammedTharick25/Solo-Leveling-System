import * as notificationService from "./notification.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../../middleware/validate.middleware.js";
import * as pushService from "./push.service.js";

const router = Router();
router.use(protect);

router.get("/push/public-key", (_req, res) => {
  sendSuccess(res, { publicKey: pushService.getPublicKey() }, "Push configuration retrieved.");
});

router.post(
  "/push/subscribe",
  [
    body("subscription.endpoint").isURL({ require_tld: false }),
    body("subscription.keys.p256dh").isString().notEmpty(),
    body("subscription.keys.auth").isString().notEmpty(),
    body("timeZone").optional().isString().isLength({ max: 100 }),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const settings = await pushService.saveSubscription(req.userId, req.body);
    sendSuccess(res, { settings }, "Device streak reminder enabled.");
  }),
);

router.patch(
  "/push/reminder",
  [
    body("enabled").isBoolean(),
    body("time").matches(/^([01]\\d|2[0-3]):[0-5]\\d$/),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const settings = await pushService.updateReminder(req.userId, req.body);
    sendSuccess(res, { settings }, "Streak reminder preferences saved.");
  }),
);

router.delete(
  "/push/subscribe",
  [body("endpoint").isURL({ require_tld: false }), validate],
  asyncHandler(async (req, res) => {
    await pushService.removeSubscription(req.userId, req.body.endpoint);
    sendSuccess(res, {}, "This device was disconnected from push reminders.");
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getNotifications(req.userId, page, limit);
    sendSuccess(res, result, "Notifications retrieved.");
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(req.params.id, req.userId);
    sendSuccess(res, { notification }, "Notification marked as read.");
  }),
);

router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await notificationService.markAllAsRead(req.userId);
    sendSuccess(res, {}, "All notifications marked as read.");
  }),
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    await notificationService.clearNotifications(req.userId);
    sendSuccess(res, {}, "Notification history cleared.");
  }),
);

export default router;
