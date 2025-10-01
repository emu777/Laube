if (typeof self === 'undefined') {
  // This file is not a service worker, so do nothing.
} else {
  // workbox-sw.jsをインポートします。next-pwaがビルド時に正しいパスに置き換えます。
  self.importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

  // next-pwaが生成するプリキャッシュマニフェストを挿入します。
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

  workbox.setConfig({
    debug: false,
  });

  // キャッシュ戦略
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );

  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

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
}
