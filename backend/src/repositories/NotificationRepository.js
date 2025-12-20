// src/repositories/NotificationRepository.js
import BaseRepository from "./BaseRepository.js";
import Notification from "../models/notification.js";

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  /**
   * Ví dụ: Xóa tất cả thông báo cũ
   */
  async deleteOldNotifications(days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return await this.deleteMany({ createdAt: { $lt: date } });
  }
}

export default new NotificationRepository();
