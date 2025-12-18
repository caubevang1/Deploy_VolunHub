// src/repositories/OtpRepository.js
import BaseRepository from "./BaseRepository.js";
import Otp from "../models/otp.js";

class OtpRepository extends BaseRepository {
  constructor() {
    super(Otp);
  }

  /**
   * Tạo OTP mới với thời gian hết hạn mặc định
   */
  async createOtp(email, otp, purpose) {
    return await this.create({
      email,
      otp,
      purpose,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
    });
  }

  /**
   * Xác thực và xóa OTP ngay lập tức (Logic nghiệp vụ Verify)
   * Giữ nguyên tính nguyên tử (Atomic) nhưng đóng gói vào hàm có tên nghiệp vụ
   */
  async verifyAndExpire(email, otp, purpose) {
    try {
      // findOneAndDelete là đặc thù của Mongo, nhưng khi bọc trong Repo này,
      // Controller chỉ thấy "verifyAndExpire"
      const record = await this.model.findOneAndDelete({
        email,
        otp,
        purpose,
      }).lean();

      if (!record) return false;

      // Kiểm tra hết hạn
      const isExpired = new Date(record.expiresAt) < new Date();
      return !isExpired;
    } catch (error) {
      return false;
    }
  }

  /**
   * Dọn dẹp OTP cũ sau khi đổi mật khẩu thành công
   */
  async clearOtps(email, purpose) {
    return await this.deleteMany({ email, purpose });
  }
}

export default new OtpRepository();