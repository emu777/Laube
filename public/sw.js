/* eslint-disable no-undef */

// Workboxライブラリをインポート
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Workboxが正常に読み込まれたか確認
if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);

  // next-pwaが生成するプリキャッシュマニフェストを挿入する
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

  // プッシュ通知イベントのリスナー
  self.addEventListener('push', function (event) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge.png',
      data: { href: data.href || '/' },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  });

  // 通知クリックイベントのリスナー
  self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.href || '/'));
  });
} else {
  console.log(`Boo! Workbox didn't load 😬`);
}
