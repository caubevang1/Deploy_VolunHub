// src/repositories/SubscriptionRepository.js
import BaseRepository from "./BaseRepository.js";
import Subscription from "../models/subscription.js";

class SubscriptionRepository extends BaseRepository {
  constructor() {
    super(Subscription);
  }

  /**
   * Tìm subscription theo endpoint (Dùng để kiểm tra trùng lặp)
   */
  async findByEndpoint(endpoint) {
    return await this.findOne({ endpoint });
  }

  /**
   * Lấy tất cả subscription của một danh sách người dùng
   */
  async findByUserIds(userIds) {
    // find() từ BaseRepository sẽ tự động đổi _id thành id cho kết quả trả về
    return await this.find({ user: { $in: userIds } });
  }
}

export default new SubscriptionRepository();