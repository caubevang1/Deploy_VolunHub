import BaseRepository from "./BaseRepository.js";
import EventAction from "../models/eventAction.js";

class EventActionRepository extends BaseRepository {
  constructor() {
    super(EventAction);
  }

  // Sau này bạn có thể thêm các hàm thống kê hành động người dùng tại đây
  // Ví dụ: Lấy danh sách những người đã Like sự kiện này
  async getUsersByAction(eventId, type = "LIKE") {
    return await this.find({ event: eventId, type }, "user", {}, "user");
  }
}

// Xuất ra instance duy nhất (Singleton)
export default new EventActionRepository();