// このファイルはnext-pwaによってビルド時に読み込まれ、
// 生成されるService Workerファイル(sw.js)に結合されます。

// プッシュ通知イベントのリスナー
self.addEventListener('push', function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge.png',
    tag: data.tag,
    data: { href: data.href },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 通知クリックイベントのリスナー
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.href || '/'));
});
