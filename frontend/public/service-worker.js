// public/service-worker.js

self.addEventListener('push', function(event) {
  let data = { title: 'VolunteerHub', body: 'Bạn có thông báo mới' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      // Nếu không parse được JSON, lấy text thuần làm nội dung
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.data?.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      const targetUrl = event.notification.data.url || '/';
      
      // Tìm xem có tab nào đang mở đúng URL đó không để focus
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Nếu không có tab nào đang mở thì mở tab mới
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});