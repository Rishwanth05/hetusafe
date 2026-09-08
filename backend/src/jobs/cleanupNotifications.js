const cron = require('node-cron');
const pool = require('../db');
const fs   = require('fs');
const path = require('path');

const LOG_DIR  = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'cleanup.log');

function appendLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line);
  } catch (err) {
    console.error('[cleanup] Log write failed:', err.message);
  }
  console.log(`[cleanup] ${message}`);
}

function startCleanupJob() {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await pool.query(
        `DELETE FROM notifications
         WHERE created_at < NOW() - INTERVAL '24 hours'
            OR (deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '24 hours')
         RETURNING id`
      );
      appendLog(`Deleted ${result.rowCount} notifications older than 24h`);
    } catch (err) {
      appendLog(`ERROR during cleanup: ${err.message}`);
    }
  });

  appendLog('Notification cleanup job scheduled (runs every hour)');
}

module.exports = { startCleanupJob };
