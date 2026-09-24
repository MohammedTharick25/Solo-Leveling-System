import userService from "./user.service.js";
import { sendSuccess, asyncHandler } from "../../lib/helpers.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";
import User from "./user.model.js";
import Hunter from "../hunter/hunter.model.js";
import cloudinary from "../../lib/cloudinary.js";
import { buildExcelXml, buildSimplePdf } from "./user.service.js";

class UserController {
  getMe = asyncHandler(async (req, res) => {
    sendSuccess(res, { user: req.user }, "Profile retrieved.");
  });

  updateMe = asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.userId, req.body);
    sendSuccess(res, { user }, "Profile updated.");
  });

  getSettings = asyncHandler(async (req, res) => {
    const data = await userService.getSettings(req.userId);
    sendSuccess(res, data, "Settings retrieved.");
  });

  updateSettings = asyncHandler(async (req, res) => {
    const settings = await userService.updateSettings(req.userId, req.body);
    sendSuccess(res, { settings }, "Settings updated.");
  });

  updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await userService.updatePassword(req.userId, currentPassword, newPassword);
    sendSuccess(res, {}, "Password updated successfully. All other sessions were signed out.");
  });

  logoutAllDevices = asyncHandler(async (req, res) => {
    await userService.logoutAllDevices(req.userId);
    sendSuccess(res, {}, "All other sessions have been signed out.");
  });

  deactivateMe = asyncHandler(async (req, res) => {
    await userService.deactivateAccount(req.userId, req.body?.password);
    sendSuccess(res, {}, "Account deactivated.");
  });

  deleteMe = asyncHandler(async (req, res) => {
    await userService.deleteAccount(req.userId, req.body?.password);
    res.clearCookie("refreshToken");
    sendSuccess(res, {}, "Account permanently deleted.");
  });

  exportMe = asyncHandler(async (req, res) => {
    const format = String(req.query.format || "json").toLowerCase();
    const data = await userService.exportAccountData(req.userId);
    const date = new Date().toISOString().slice(0, 10);

    if (format === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="solo-leveling-account-export-${date}.json"`);
      return res.status(200).send(JSON.stringify(data, null, 2));
    }

    if (format === "excel" || format === "xls") {
      res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="solo-leveling-account-export-${date}.xls"`);
      return res.status(200).send(buildExcelXml(data));
    }

    if (format === "pdf") {
      const pdf = buildSimplePdf(data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="solo-leveling-account-export-${date}.pdf"`);
      return res.status(200).send(pdf);
    }

    throw new AppError("Unsupported export format. Use json, excel, or pdf.", 400);
  });

  getSessions = asyncHandler(async (req, res) => {
    const currentRefreshToken = req.cookies?.refreshToken || "";
    const sessions = await userService.getSessions(req.userId, currentRefreshToken);
    sendSuccess(res, { sessions }, "Active sessions retrieved.");
  });

  revokeSession = asyncHandler(async (req, res) => {
    const currentRefreshToken = req.cookies?.refreshToken || "";
    const result = await userService.revokeSession(req.userId, req.params.sessionId, currentRefreshToken);
    if (result.current) res.clearCookie("refreshToken");
    sendSuccess(res, result, result.current ? "Current session signed out." : "Session signed out.");
  });

  removeAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.avatar?.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (err) {
        console.warn("Could not delete avatar from Cloudinary:", err.message);
      }
    }

    user.avatar = { url: "", public_id: undefined };
    await user.save({ validateBeforeSave: false });
    await Hunter.findOneAndUpdate({ userId: req.userId }, { avatar: { url: "", publicId: undefined } });

    sendSuccess(res, { avatar: user.avatar }, "Avatar removed successfully.");
  });

  updateAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError("Upload failed. Verify the selected image and Cloudinary credentials.", 400);
    }

    const user = await User.findById(req.userId);
    if (!user) throw new AppError("User not found", 404);

    if (user.avatar?.public_id) {
      try {
        await cloudinary.uploader.destroy(user.avatar.public_id);
      } catch (err) {
        console.warn("Could not delete old avatar:", err.message);
      }
    }

    user.avatar = {
      url: req.file.path,
      public_id: req.file.filename,
    };
    await user.save();

    await Hunter.findOneAndUpdate(
      { userId: req.userId },
      { avatar: { url: req.file.path, publicId: req.file.filename } },
    );

    sendSuccess(res, { avatar: user.avatar }, "Avatar updated successfully.");
  });
}

export default new UserController();
