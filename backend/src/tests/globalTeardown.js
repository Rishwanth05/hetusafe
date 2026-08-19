'use strict';

// globalTeardown runs in its own process — it cannot reach pool/redis
// instances created in test workers. Those are closed in each test file's
// afterAll(). This file exists so Jest has a teardown hook for any
// future global state that does need cleanup here.
module.exports = async () => {};
