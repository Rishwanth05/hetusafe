importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAdrnZfkSBUCAgTyII29mGpigvEW6n1ENc',
  authDomain: 'project-save-77410.firebaseapp.com',
  projectId: 'project-save-77410',
  messagingSenderId: '367151780181',
  appId: '1:367151780181:web:5062e70af7ba73cf2e1fdc',
});

// firebase.messaging() registers the SDK's internal push and notificationclick
// listeners immediately. Our notificationclick listener below runs after it.
const messaging = firebase.messaging();

console.log('[SW] Firebase messaging service worker loaded');

messaging.onBackgroundMessage((payload) => {
  // Backend sends data-only messages (title and body are in payload.data).
  // Fall back to payload.notification for messages already in flight during
  // a rolling deploy where the backend has not yet been updated.
  const title = payload.data?.title || payload.notification?.title || 'New Hazard Report';
  const body  = payload.data?.body  || payload.notification?.body  || 'A new hazard has been reported nearby.';

  // Pass payload.data as the notification data so the click handler can read
  // reportId. Do not include FCM_MSG here — that key is reserved by the SDK
  // and would cause the SDK's own notificationclick handler to intercept clicks
  // and suppress our deep-link navigation.
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
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          // navigate() only works for clients controlled by this SW. After the
          // scope change the Firebase SW does not control any page (Workbox
          // holds scope "/"), so navigate() will reject. Fall back to
          // openWindow so the user still lands on the right page; the trade-off
          // is a new tab may open instead of reusing the existing one.
          return client.navigate(url).catch(() => clients.openWindow(url));
        }
      }
      return clients.openWindow(url);
    })
  );
});
