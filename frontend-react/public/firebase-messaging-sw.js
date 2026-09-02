importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAdrnZfkSBUCAgTyII29mGpigvEW6n1ENc',
  authDomain: 'project-save-77410.firebaseapp.com',
  projectId: 'project-save-77410',
  messagingSenderId: '367151780181',
  appId: '1:367151780181:web:5062e70af7ba73cf2e1fdc',
});

const messaging = firebase.messaging();

console.log('[SW] Firebase messaging service worker loaded');

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'New Hazard Report';
  const body = payload.notification?.body || 'A new hazard has been reported nearby.';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { reportId } = event.notification.data || {};
  const url = reportId ? `/results?focus=${reportId}` : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the app is already open in a tab, focus it and navigate there.
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(url);
        }
      }
      // App is closed — open a new window.
      return clients.openWindow(url);
    })
  );
});
