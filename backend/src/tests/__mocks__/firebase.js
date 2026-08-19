'use strict';

// Prevents firebase-admin from attempting any network calls during tests.
const sendPushNotification = jest.fn().mockResolvedValue(undefined);

module.exports = { sendPushNotification };
