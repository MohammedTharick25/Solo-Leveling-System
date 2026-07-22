import User from "./user.model.js";

class UserRepository {
  async findById(id, select = "") {
    return await User.findById(id).select(select);
  }

  async updateById(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
  }

  // Used for password updates where we need the document instance to trigger .save() hooks
  async findRawById(id) {
    return await User.findById(id).select("+password");
  }
}

export default new UserRepository();