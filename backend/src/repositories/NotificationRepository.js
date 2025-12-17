import BaseRepository from "./BaseRepository.js";
import Notification from "../models/notification.js";

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }
}

export default new NotificationRepository();