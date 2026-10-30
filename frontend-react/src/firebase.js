import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

let messaging = null;
try {
  if (await isSupported()) {
    messaging = getMessaging(app);
  }
} catch (err) {
  console.warn('Firebase messaging not supported:', err.message);
}

export { messaging };

// Resolves once the registration has an active service worker, or rejects on
// timeout. SDK 0.12.x calls pushManager.subscribe() directly on the
// registration without waiting for activation, so we must gate getToken() on
// this ourselves.
export async function waitForActiveWorker(registration, timeoutMs = 10000) {
  if (registration.active) return registration;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Service worker activation timed out')),
      timeoutMs
    );
    const worker = registration.installing || registration.waiting;
    if (!worker) {
      clearTimeout(timer);
      reject(new Error('No installing or waiting service worker found'));
      return;
    }
    function onStateChange() {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', onStateChange);
        clearTimeout(timer);
        resolve(registration);
      }
    }
    worker.addEventListener('statechange', onStateChange);
  });
}

export async function requestNotificationPermission() {
  if (!messaging) return null;
  try {
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/firebase-cloud-messaging-push-scope' }
    );
    await waitForActiveWorker(registration);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (err) {
    console.warn('FCM permission denied or error:', err.message);
    return null;
  }
}

export function onMessageListener() {
  if (!messaging) return new Promise(() => {});
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => resolve(payload));
  });
}
