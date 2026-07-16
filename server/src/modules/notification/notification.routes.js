import * as notificationService from "./notification.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { Router } from "express";
import { protect } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getNotifications(
      req.userId,
      page,
      limit,
    );
    sendSuccess(res, result, "Notifications retrieved.");
  }),
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.userId,
    );
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

export default router;
