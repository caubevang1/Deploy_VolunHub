// backend/src/repositories/RegistrationRepository.js
import mongoose from "mongoose";
import BaseRepository from "./BaseRepository.js";
import Registration from "../models/registration.js";

class RegistrationRepository extends BaseRepository {
  constructor() {
    super(Registration);
  }

  /**
   * Tìm đơn đăng ký cụ thể của User cho một Event
   * Tự động ép kiểu để tránh lỗi không tìm thấy do sai định dạng ID
   */
  async findOneUserRegistration(userId, eventId) {
    return await this.model.findOne({
      volunteer: new mongoose.Types.ObjectId(userId),
      event: new mongoose.Types.ObjectId(eventId)
    }).lean();
  }

  async getRegistrationStatsByEventIds(eventIds) {
    const ids = eventIds.map(id => new mongoose.Types.ObjectId(id));
    return await this.model.aggregate([
      { $match: { event: { $in: ids } } },
      {
        $group: {
          _id: "$event",
          totalRegistrations: { $sum: 1 },
          cancelRequests: { $sum: { $cond: ["$cancelRequest", 1, 0] } },
        },
      },
    ]);
  }

  async getRegistrationStatsBatch(eventIds) {
    const ids = eventIds.map(id => new mongoose.Types.ObjectId(id));
    return await this.model.aggregate([
      { $match: { event: { $in: ids } } },
      {
        $group: {
          _id: "$event",
          totalRegistrations: { $sum: 1 },
          cancelRequests: {
            $sum: { $cond: [{ $eq: ["$cancelRequest", true] }, 1, 0] },
          },
        },
      },
    ]);
  }

  async findByTimeRange(filter = {}) {
    return await this.find(filter, null, { sort: { createdAt: 1 } });
  }
}

export default new RegistrationRepository();