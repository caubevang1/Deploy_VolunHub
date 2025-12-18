// src/repositories/UserRepository.js
import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import User from "../models/user.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Tìm người dùng kèm mật khẩu qua email hoặc username
   */
  async findByIdentifierWithPassword(identifier) {
    const filter = identifier.includes("@") ? { email: identifier } : { username: identifier };
    const user = await this.model.findOne(filter).select("+password").lean();
    return this.transform(user);
  }

  /**
   * Tìm người dùng bằng ID kèm mật khẩu
   */
  async findByIdWithPassword(id) {
    const user = await this.model.findById(id).select("+password").lean();
    return this.transform(user);
  }

  /**
   * Tăng điểm tích lũy cho người dùng
   */
  async incrementPoints(userId, points) {
    return await this.findByIdAndUpdate(userId, { $inc: { points } });
  }

  /**
   * Lấy toàn bộ danh sách người dùng (loại bỏ mật khẩu)
   */
  async findAllExceptPassword() {
    return await this.find({}, "-password");
  }

  /**
   * Cập nhật trạng thái (ACTIVE/LOCKED)
   */
  async updateStatus(id, status) {
    return await this.findByIdAndUpdate(id, { status });
  }

  /**
   * Cập nhật quyền hạn (ADMIN/VOLUNTEER/EVENTMANAGER)
   */
  async updateRole(id, role) {
    return await this.findByIdAndUpdate(id, { role: role.toUpperCase() });
  }

  /**
   * Chuẩn bị dữ liệu để xuất file Excel/CSV
   */
  async getUsersForExport() {
    const users = await this.find({}, "-password -__v");
    return users.map(u => ({
      ...u,
      birthday: u.birthday ? new Date(u.birthday).toISOString() : "",
    }));
  }

  /**
   * Lấy danh sách Top tình nguyện viên theo điểm số
   */
  async getTopVolunteers(limit = 10) {
    return await this.find(
      { role: "VOLUNTEER", status: "ACTIVE" },
      "name avatar points email",
      { sort: { points: -1 }, limit }
    );
  }

  /**
   * Cập nhật mật khẩu qua email (Dùng cho Reset Password)
   */
  async updatePasswordByEmail(email, hashedPassword) {
    return await this.findOneAndUpdate(
      { email }, 
      { password: hashedPassword }
    );
  }

  /**
   * 🏆 Lấy bảng xếp hạng Quản lý sự kiện (EventManager)
   * Tính toán dựa trên: Số sự kiện đã tạo + Số lượng tình nguyện viên tham gia
   */
  async getManagerRankingWithStats(limit = 10) {
    const Event = mongoose.model("Event");
    const Registration = mongoose.model("Registration");

    // Lấy danh sách Manager đang hoạt động
    const managers = await this.model.find({ role: "EVENTMANAGER", status: "ACTIVE" }).lean();

    const results = await Promise.all(managers.map(async (m) => {
      // Tìm tất cả sự kiện do manager này tạo
      const events = await Event.find({ createdBy: m._id }).select("_id status").lean();
      const eventIds = events.map(e => e._id);

      // Đếm tổng số tình nguyện viên đã được duyệt tham gia các sự kiện của manager này
      const totalVolunteers = await Registration.countDocuments({ 
        event: { $in: eventIds }, 
        status: "approved" 
      });

      // Đếm số sự kiện đã hoàn thành
      const completedEventsCount = events.filter(e => e.status === "completed").length;

      // Công thức tính score: (Mỗi sự kiện * 10) + (Mỗi TNV đã duyệt * 1)
      const score = (events.length * 10) + totalVolunteers;

      return {
        ...this.transform(m),
        totalEvents: events.length,
        completedEvents: completedEventsCount,
        totalVolunteers,
        score
      };
    }));

    // Sắp xếp giảm dần theo score và lấy giới hạn
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export default new UserRepository();