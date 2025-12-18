// src/repositories/RegistrationRepository.js
import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import Registration from "../models/registration.js";

class RegistrationRepository extends BaseRepository {
  constructor() {
    super(Registration);
  }

  async checkMemberStatus(userId, eventId) {
    const reg = await this.findOne({ event: eventId, volunteer: userId, status: 'approved' });
    return !!reg;
  }

  async findOneUserRegistration(userId, eventId) {
    try {
      const res = await this.model.findOne({
        volunteer: new mongoose.Types.ObjectId(userId),
        event: new mongoose.Types.ObjectId(eventId)
      }).lean();
      return this.transform(res);
    } catch (error) {
      return null;
    }
  }

  async getRegistrationsByEvent(eventId) {
    return await this.find({ event: eventId }, null, { sort: { createdAt: -1 } }, "volunteer");
  }

  /**
   * Lấy dữ liệu Dashboard cho Tình nguyện viên (Volunteer)
   */
  async getVolunteerDashboardData(volunteerId) {
    const now = new Date();
    // Bắt buộc phải populate 'event' để thực hiện lọc theo thời gian ở Frontend
    const registrations = await this.find(
      { volunteer: volunteerId }, 
      null, 
      { sort: { createdAt: -1 } }, 
      "event"
    );

    return {
      completedEvents: registrations.filter((r) => r.status === "completed"),
      currentEvents: registrations.filter((r) => r.status === "approved" && r.event && new Date(r.event.date) <= now),
      upcomingEvents: registrations.filter((r) => r.status === "approved" && r.event && new Date(r.event.date) > now),
      pendingEvents: registrations.filter((r) => r.status === "pending"),
    };
  }

  /**
   * Thống kê tổng quan số lượng cho Tình nguyện viên bằng Pipeline Aggregate
   */
  async getVolunteerDashboardStats(volunteerId) {
    const vId = new mongoose.Types.ObjectId(volunteerId);
    const stats = await this.model.aggregate([
      { $match: { volunteer: vId } },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          totalCompleted: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          totalApproved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          totalPending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          totalCancelRequests: { $sum: { $cond: ["$cancelRequest", 1, 0] } },
        },
      },
    ]);

    const result = stats[0] || {
      totalRegistrations: 0, totalCompleted: 0, totalApproved: 0, totalPending: 0, totalCancelRequests: 0,
    };

    return {
      ...result,
      completionRate: result.totalRegistrations ? ((result.totalCompleted / result.totalRegistrations) * 100).toFixed(2) : 0,
      approvalRate: result.totalRegistrations ? ((result.totalApproved / result.totalRegistrations) * 100).toFixed(2) : 0,
    };
  }

  /**
   * Thống kê lượt đăng ký theo từng tháng cho Quản lý (Manager)
   */
  async getManagerMonthlyRegistrationStats(eventIds, year) {
    const ids = eventIds.map(id => new mongoose.Types.ObjectId(id));
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year}-12-31T23:59:59.999Z`);

    const regs = await this.model.find({
      event: { $in: ids },
      createdAt: { $gte: start, $lte: end }
    }).select("createdAt").lean();

    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, registrations: 0 }));
    regs.forEach((r) => {
      monthly[new Date(r.createdAt).getMonth()].registrations++;
    });
    return monthly;
  }

  /**
   * Trả về dữ liệu xuất báo cáo Tình nguyện viên (Loại bỏ mật khẩu và Mongo IDs)
   */
  async getVolunteersExportData() {
    const User = mongoose.model("User");
    const volunteers = await User.find({ role: "VOLUNTEER" }).lean();
    return await Promise.all(volunteers.map(async (v) => {
      const completedEventsCount = await this.countDocuments({ volunteer: v._id, status: "completed" });
      return {
        id: v._id.toString(), 
        name: v.name || "", 
        email: v.email || "",
        phone: v.phone || "", 
        status: v.status || "", 
        points: v.points || 0,
        completedEventsCount
      };
    }));
  }

  /**
   * Bảng xếp hạng Tình nguyện viên kèm tỷ lệ hoàn thành
   */
  async getVolunteerRankingWithCompletion(limit = 10) {
    const User = mongoose.model("User");
    const volunteers = await User.find({ role: "VOLUNTEER" }).sort({ points: -1 }).limit(limit).lean();
    
    const results = await Promise.all(volunteers.map(async (v, i) => {
      const completedEvents = await this.countDocuments({ volunteer: v._id, status: "completed" });
      return { ...v, id: v._id.toString(), rank: i + 1, completedEvents };
    }));

    return results.map(r => {
      delete r._id; delete r.__v; delete r.password;
      return r;
    });
  }
}
export default new RegistrationRepository();