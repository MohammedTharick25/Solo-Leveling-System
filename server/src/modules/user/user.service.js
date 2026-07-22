import userRepository from "./user.repository.js";
import { AppError } from "../../middleware/errorHandler.middleware.js";

class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    return user.toSafeObject();
  }

  async updateProfile(userId, updateBody) {
    const allowed = ["country", "timezone"];
    const updates = Object.fromEntries(
      Object.entries(updateBody).filter(([k]) => allowed.includes(k))
    );

    const user = await userRepository.updateById(userId, updates);
    return user.toSafeObject();
  }

  async updatePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findRawById(userId);
    if (!user) throw new AppError("User not found", 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new AppError("Current password is incorrect.", 401);

    user.password = newPassword;
    await user.save(); // Triggers the pre-save hashing hook
    return true;
  }

  async deactivateAccount(userId) {
    await userRepository.updateById(userId, { isActive: false });
    return true;
  }
}

export default new UserService();