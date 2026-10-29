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

export async function requestNotificationPermission() {
  if (!messaging) return null;
  try {
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/firebase-cloud-messaging-push-scope' }
    );
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
