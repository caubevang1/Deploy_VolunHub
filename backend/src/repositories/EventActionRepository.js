// src/repositories/EventActionRepository.js
import BaseRepository from "./BaseRepository.js";
import EventAction from "../models/eventAction.js";
import mongoose from "mongoose";

class EventActionRepository extends BaseRepository {
  constructor() {
    super(EventAction);
  }

  /**
   * Helper nội bộ chuẩn hóa ID người dùng và sự kiện sang ObjectId
   */
  #prepareFilter(userId, eventId) {
    return {
      user: typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId,
      event: typeof eventId === "string" ? new mongoose.Types.ObjectId(eventId) : eventId
    };
  }

  /**
   * Tìm bản ghi Like cụ thể của một user trên một sự kiện
   */
  async findUserLike(userId, eventId) {
    const filter = this.#prepareFilter(userId, eventId);
    // findOne của BaseRepository đã tự động gọi this.transform()
    return await this.findOne({
      ...filter,
      type: "LIKE"
    });
  }

  /**
   * Kiểm tra xem user đã like sự kiện chưa (trả về boolean)
   */
  async checkUserLiked(userId, eventId) {
    const action = await this.findUserLike(userId, eventId);
    return !!action;
  }

  /**
   * Lấy danh sách người dùng đã thực hiện một hành động cụ thể
   */
  async getUsersByAction(eventId, type = "LIKE") {
    const eId = typeof eventId === "string" ? new mongoose.Types.ObjectId(eventId) : eventId;
    // find của BaseRepository đã tự động gọi this.transform()
    return await this.find({ event: eId, type }, null, {}, "user");
  }
}

export default new EventActionRepository();