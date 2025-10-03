/* eslint-disable no-restricted-globals */

// public/sw.js

// Service Workerがインストールされたときに即座に有効化する
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(self.clients.claim());
});

// プッシュ通知イベントのリスナー
self.addEventListener('push', function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { href: data.href || '/' },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 通知クリックイベントのリスナー
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.href || '/'));
});
