self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'CineTrack', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'CineTrack';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/assets/cinetrack-logo.png',
    badge: payload.badge || '/assets/cinetrack-logo.png',
    tag: payload.tag || 'cinetrack-notification',
    data: {
      url: payload.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = allClients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      if ('navigate' in existing) await existing.navigate(targetUrl);
      return;
    }
    await clients.openWindow(targetUrl);
  })());
});
