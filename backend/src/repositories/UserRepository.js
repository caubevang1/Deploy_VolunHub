import BaseRepository from "./BaseRepository.js";
import User from "../models/user.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Lấy User kèm mật khẩu để xác thực đăng nhập
   * Hỗ trợ tìm theo cả email hoặc username
   */
  async findByIdentifierWithPassword(identifier) {
    const filter = identifier.includes("@") ? { email: identifier } : { username: identifier };
    // Sử dụng .select("+password") để lấy trường bị ẩn mặc định trong schema
    return await this.model.findOne(filter).select("+password").lean();
  }

  /**
   * Lấy User kèm mật khẩu bằng ID để xử lý đổi mật khẩu
   */
  async findByIdWithPassword(id) {
    // Thêm .lean() để trả về plain object, đảm bảo tính độc lập driver
    return await this.model.findById(id).select("+password").lean();
  }

  /**
   * Tăng hoặc giảm điểm thưởng (Atomic update)
   * Đóng gói logic $inc để Controller hoàn toàn độc lập với cú pháp MongoDB
   */
  async incrementPoints(userId, points) {
    // points có thể là số dương (cộng điểm) hoặc số âm (trừ điểm)
    return await this.model.findByIdAndUpdate(
      userId, 
      { $inc: { points } }, 
      { new: true }
    ).lean();
  }
}

// Xuất ra một instance duy nhất (Singleton) để quản lý bộ nhớ hiệu quả
export default new UserRepository();