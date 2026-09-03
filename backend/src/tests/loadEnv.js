'use strict';

const fs = require('fs');
const path = require('path');
// Must run before any app module is loaded so that db.js / redis.js
// read the test values when they first initialise their connections.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

// .env.test.local is gitignored and overrides individual values from .env.test
// for local development (e.g. DB_DEV_URL with the local Postgres password).
const localEnv = path.resolve(__dirname, '../../.env.test.local');
if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv, override: true });
}
