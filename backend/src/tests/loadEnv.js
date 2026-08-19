'use strict';

const path = require('path');
// Must run before any app module is loaded so that db.js / redis.js
// read the test values when they first initialise their connections.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });
