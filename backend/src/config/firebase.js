const admin = require('firebase-admin')

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
    console.log('Firebase Admin initialized successfully')
  } catch (err) {
    console.error('Firebase Admin init failed:', err.message)
  }
}

async function sendPushNotification(token, title, body, data = {}) {
  try {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };
    const response = await admin.messaging().send(message);
    console.log(`FCM sent to ${token.slice(0, 20)}...: ${response}`);
  } catch (err) {
    console.error(`FCM failed for token ${token.slice(0, 20)}...: ${err.message}`);
  }
}

async function sendPushNotificationBatch(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return;
  try {
    const message = {
      tokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };
    const batchResponse = await admin.messaging().sendEachForMulticast(message);
    if (batchResponse.failureCount > 0) {
      batchResponse.responses.forEach((r, i) => {
        if (!r.success) {
          console.error(`FCM failed for token ${tokens[i].slice(0, 20)}...: ${r.error.message}`);
        }
      });
    }
    console.log(`FCM batch: ${batchResponse.successCount}/${tokens.length} sent`);
  } catch (err) {
    console.error(`FCM batch failed: ${err.message}`);
  }
}

module.exports = { sendPushNotification, sendPushNotificationBatch };
