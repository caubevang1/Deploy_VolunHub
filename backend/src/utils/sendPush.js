// backend/src/utils/sendPush.js
import webpush from 'web-push';
import Subscription from '../models/subscription.js';
import Notification from '../models/notification.js';

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

    // 1. Lưu thông báo vào Database (Non-blocking)
    // Trường 'type' sẽ lưu tiêu đề tiếng Việt để hiển thị trên Dashboard
    Notification.create({
      user: userId,
      type: title, 
      message: message,
    }).then(doc => console.log('✅ Đã lưu thông báo vào DB:', doc._id))
      .catch(err => console.error('❌ Lỗi lưu thông báo DB:', err.message));

    // 2. Lấy danh sách thiết bị đã đăng ký
    const userSubscriptions = await Subscription.find({ user: userId });
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