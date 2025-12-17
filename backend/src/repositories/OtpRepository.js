import BaseRepository from "./BaseRepository.js";
import Otp from "../models/otp.js";

class OtpRepository extends BaseRepository {
  constructor() {
    super(Otp);
  }

  // Xác thực và xóa OTP ngay lập tức (Atomic operation)
  async findAndVerify(email, otp, purpose) {
    return await this.model.findOneAndDelete({
      email,
      otp,
      purpose,
    }).lean();
  }
}

export default new OtpRepository();