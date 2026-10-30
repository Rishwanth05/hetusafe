'use strict';

// Builds a data-only FCM message payload. title and body are written AFTER
// the stringified extraData so they can never be overridden by caller keys.
function buildPushMessage(title, body, extraData = {}) {
  return {
    data: {
      ...Object.fromEntries(
        Object.entries(extraData).map(([k, v]) => [k, String(v)])
      ),
      title,
      body,
    },
  };
}

module.exports = { buildPushMessage };
