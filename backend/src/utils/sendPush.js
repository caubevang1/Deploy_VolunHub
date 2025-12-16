import webpush from 'web-push';
import Subscription from '../models/subscription.js';
import Notification from '../models/notification.js';

/**
 * Hàm gửi Push Notification VÀ lưu vào DB
 * @param {string} userId - ID của người nhận
 * @param {string} title - Tiêu đề (VD: "Đánh giá: Tốt 🌟")
 * @param {string} message - Nội dung (VD: "Hoàn thành tốt nhiệm vụ...")
 * @param {string} url - Link mở khi click
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

    // 1. Lưu thông báo vào Database (Non-blocking)
    Notification.create({
      user: userId,
      type: title, 
      message: message,
    }).catch(err => console.error('❌ DB Error:', err.message));

    // 2. Lấy danh sách thiết bị đã đăng ký
    const userSubscriptions = await Subscription.find({ user: userId });
    if (!userSubscriptions || userSubscriptions.length === 0) return;

    // 3. Payload chuẩn gửi sang Service Worker
    const payload = JSON.stringify({
      title: title,
      body: message,
      icon: '/logo192.png',
      data: { url: url }
    });

    // 4. Gửi đến các thiết bị
    userSubscriptions.forEach(sub => {
      webpush.sendNotification(sub.toObject(), payload)
        .catch(err => {
          if (err.statusCode === 410) {
            Subscription.findByIdAndDelete(sub._id).exec();
          }
        });
    });

  } catch (error) {
    console.error('Lỗi sendPushNotification:', error.message);
  }
};