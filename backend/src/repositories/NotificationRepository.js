import BaseRepository from "./BaseRepository.js";
import Notification from "../models/notification.js";

const NotificationRepository = new BaseRepository(Notification);

export default NotificationRepository;
