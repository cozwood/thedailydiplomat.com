// Service worker for The Daily Diplomat.
// One job: receive the once-a-day push (a payloadless "tickle" from the
// tdd-subscribe Worker's cron, sent at 08:00 in this device's timezone)
// and show the daily-brief notification.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('The Daily Diplomat', {
      body: "Today's brief is on the wire — eight desks, one dispatch.",
      icon: '/favicon-192x192.png',
      badge: '/favicon-192x192.png',
      tag: 'tdd-daily-brief',
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
