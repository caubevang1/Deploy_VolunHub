// backend/src/utils/sendPush.js
import webpush from "web-push";
import SubscriptionRepository from "../repositories/SubscriptionRepository.js";
import NotificationRepository from "../repositories/NotificationRepository.js";

/**
 * Hàm gửi Push Notification VÀ lưu vào DB
 */
export const sendPushNotification = async (userId, title, message, url = '/') => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('⚠️ VAPID keys are missing.');
    } else {
      webpush.setVapidDetails(
        'mailto:mr.tuanhoang84@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }

    // 1. Lưu thông báo vào Database (Non-blocking) qua repository
    NotificationRepository.create({
      user: userId,
      type: title,
      message,
    })
      .then((doc) => console.log("✅ Đã lưu thông báo vào DB:", doc._id))
      .catch((err) => console.error("❌ Lỗi lưu thông báo DB:", err.message));

    // 2. Lấy danh sách thiết bị đã đăng ký (lean objects) qua repository
    const userSubscriptions = await SubscriptionRepository.find({ user: userId });
    if (!userSubscriptions || userSubscriptions.length === 0) {
      console.log(`🔕 Người dùng ${userId} chưa đăng ký nhận Push.`);
      return;
    }

    // 3. Payload chuẩn gửi sang Service Worker
    const payload = JSON.stringify({
      title: title,
      body: message,
      icon: '/logo192.png',
      data: { url: url }
    });

    // 4. Gửi đến các thiết bị (nếu subscription là lean object thì dùng trực tiếp)
    await Promise.all(
      userSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (err) {
          console.error("❌ Push send error for subscription:", sub._id, err?.statusCode || err?.message || err);
          if (err && err.statusCode === 410) {
            try {
              await SubscriptionRepository.findByIdAndDelete(sub._id);
            } catch (delErr) {
              console.error("❌ Lỗi khi xóa subscription không hợp lệ:", delErr);
            }
          }
        }
      })
    );

  } catch (error) {
    console.error('Lỗi sendPushNotification:', error.message);
  }
};