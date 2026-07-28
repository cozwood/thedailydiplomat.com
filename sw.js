// Service worker for The Daily Diplomat.
// Receives the payloadless "tickle" push from the tdd-subscribe Worker's cron
// and shows a notification. Two kinds arrive on the same channel:
//   - the daily brief, at 08:00 in this device's timezone (all subscribers)
//   - a watchdog alarm, when the morning run failed to publish (operator
//     devices only, flagged admin server-side)
// The push carries no body (no RFC 8291 encryption), so the wording is fetched
// from the Worker on wake. If that fetch fails for any reason we fall back to
// the daily-brief copy — the notification still fires, it just can't be
// specific. Never show a generic "brief is ready" for an outage alarm: that
// would say the opposite of the truth.

const PUSH_API = 'https://tdd-subscribe.carter-oswood.workers.dev';

const FALLBACK = {
  title: 'The Daily Diplomat',
  body: "Today's brief is on the wire — eight desks, one dispatch.",
  tag: 'tdd-daily-brief',
  url: '/',
};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function resolveNotification() {
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return FALLBACK;
    const res = await fetch(
      PUSH_API + '/api/push-payload?e=' + encodeURIComponent(sub.endpoint),
      { cache: 'no-store' }
    );
    if (!res.ok) return FALLBACK;
    const p = await res.json();
    return {
      title: p.title || FALLBACK.title,
      body: p.body || FALLBACK.body,
      tag: p.tag || FALLBACK.tag,
      url: p.url || FALLBACK.url,
    };
  } catch (e) {
    return FALLBACK;
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    resolveNotification().then((p) =>
      self.registration.showNotification(p.title, {
        body: p.body,
        icon: '/favicon-192x192.png',
        // badge must be monochrome-on-transparent or Android shows a white box
        badge: '/badge-96.png',
        tag: p.tag,
        data: { url: p.url },
      })
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
