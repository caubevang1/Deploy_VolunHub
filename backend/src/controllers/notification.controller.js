// src/controllers/notification.controller.js
import NotificationRepository from "../repositories/NotificationRepository.js";
import SubscriptionRepository from "../repositories/SubscriptionRepository.js";
import { sendPushNotification } from "../utils/sendPush.js";

/**
 * @desc Lấy tất cả thông báo của người dùng hiện tại
 */
export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await NotificationRepository.find(
      { user: req.user.id },
      null,
      { sort: { createdAt: -1 } }
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy thông báo", error: error.message });
  }
};

/**
 * @desc Trả về VAPID public key
 */
export const getVapidPublicKey = (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY || null;
    if (!publicKey) {
      return res.status(404).json({ message: "VAPID public key not configured" });
    }
    res.json({ publicKey });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving VAPID key", error: error.message });
  }
};

/**
 * @desc Đánh dấu một thông báo là đã đọc
 */
export const markAsRead = async (req, res) => {
  try {
    const updated = await NotificationRepository.findByIdAndUpdate(
      req.params.id,
      { isRead: true }
    );
    if (!updated) return res.status(404).json({ message: "Không tìm thấy thông báo" });
    
    res.json({ message: "Đã đánh dấu là đã đọc", notification: updated });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * @desc Lưu Subscription nhận Push Notification
 */
export const saveSubscription = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const userId = req.user.id; // SỬA: Dùng .id

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Thiếu thông tin subscription" });
    }

    const existingByEndpoint = await SubscriptionRepository.findOne({ endpoint });

    if (existingByEndpoint) {
      // SỬA: So sánh ID chuỗi sạch
      if (String(existingByEndpoint.user) !== String(userId)) {
        const reassigned = await SubscriptionRepository.findOneAndUpdate(
          { endpoint },
          { user: userId, keys }
        );
        return res.status(200).json({ 
          message: "Subscription transferred to current user", 
          subscription: reassigned 
        });
      }
      return res.json({ message: "Subscription đã tồn tại", subscription: existingByEndpoint });
    }

    const newSubscription = await SubscriptionRepository.create({
      user: userId,
      endpoint,
      keys,
    });

    res.status(201).json({ message: "Đăng ký thành công", subscription: newSubscription });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lưu subscription", error: error.message });
  }
};

/**
 * @desc Lấy danh sách subscriptions của user
 */
export const getMySubscriptions = async (req, res) => {
  try {
    const subs = await SubscriptionRepository.find({ user: req.user.id });
    return res.json({ subscriptions: subs });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/**
 * @desc Gửi thông báo thử nghiệm
 */
export const testPushForMe = async (req, res) => {
  try {
    const userId = req.user.id;
    // sendPushNotification bên trong utils cần xử lý ID chuỗi
    sendPushNotification(userId, "test", "Test push thành công!", "/")
      .catch((err) => console.error("testPush error:", err));
      
    return res.json({ message: "Test push initiated" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server khi gửi test push", error: error.message });
  }
};