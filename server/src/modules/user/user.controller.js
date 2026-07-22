import userService from "./user.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";

class UserController {
  getMe = asyncHandler(async (req, res) => {
    // If 'protect' middleware already attaches user to req.user:
    sendSuccess(res, { user: req.user }, "Profile retrieved.");
  });

  updateMe = asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.userId, req.body);
    sendSuccess(res, { user }, "Profile updated.");
  });

  updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await userService.updatePassword(req.userId, currentPassword, newPassword);
    sendSuccess(res, {}, "Password updated successfully.");
  });

  deleteMe = asyncHandler(async (req, res) => {
    await userService.deactivateAccount(req.userId);
    sendSuccess(res, {}, "Account deactivated.");
  });
}

export default new UserController();