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

const FCM_CHUNK_SIZE = 500;

async function sendPushNotificationBatch(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return;
  const payload = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
  };
  let totalSuccess = 0;
  for (let i = 0; i < tokens.length; i += FCM_CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + FCM_CHUNK_SIZE);
    try {
      const batchResponse = await admin.messaging().sendEachForMulticast({ ...payload, tokens: chunk });
      if (batchResponse.failureCount > 0) {
        batchResponse.responses.forEach((r, j) => {
          if (!r.success) {
            console.error(`FCM failed for token ${chunk[j].slice(0, 20)}...: ${r.error.message}`);
          }
        });
      }
      totalSuccess += batchResponse.successCount;
    } catch (err) {
      console.error(`FCM batch failed: ${err.message}`);
    }
  }
  console.log(`FCM batch: ${totalSuccess}/${tokens.length} sent`);
}

module.exports = { sendPushNotification, sendPushNotificationBatch };
