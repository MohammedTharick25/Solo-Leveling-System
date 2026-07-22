import userService from "./user.service.js";
// import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import User from "./user.model.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import cloudinary from "../../lib/cloudinary.js";

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

  updateAvatar = asyncHandler(async (req, res) => {
    // 1. Check if file exists (Multer handles the upload to Cloudinary)
    if (!req.file) {
      console.error(
        "MULTER ERROR: No file in request. Check Cloudinary credentials.",
      );
      throw new AppError("Upload failed. Verify server credentials.", 400);
    }

    const user = await User.findById(req.userId);
    if (!user) throw new AppError("User not found", 404);

    // 2. Delete old image if it exists
    if (user.avatar?.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (err) {
        console.warn("Could not delete old avatar:", err.message);
      }
    }

    // 3. Save new data
    user.avatar = {
      url: req.file.path, // This is the Cloudinary URL
      public_id: req.file.filename,
    };

    await user.save();

    console.log("SUCCESS: Avatar updated for", user.hunterName);
    sendSuccess(res, { avatar: user.avatar }, "Avatar updated successfully.");
  });
}

export default new UserController();

