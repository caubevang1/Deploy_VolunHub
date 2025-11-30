// public/service-worker.js

// Lắng nghe sự kiện Push từ server
self.addEventListener('push', function(event) {
  console.log('🔔 [Service Worker] Push message received:', event);

  // Lấy dữ liệu từ payload
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Thông báo', body: event.data.text() };
    }
  }

  // Hiển thị notification
  const options = {
    body: data.body || 'Bạn có thông báo mới',
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.data?.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'VolunteerHub', options)
  );
});

// Xử lý khi user click vào notification
self.addEventListener('notificationclick', function(event) {
  console.log('🖱️ [Service Worker] Notification clicked');
  
  event.notification.close();

  // Mở URL được chỉ định
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});