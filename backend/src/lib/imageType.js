'use strict';

// Thin CJS wrapper around the ESM-only file-type package.
// Consuming this via require() lets Jest's moduleNameMapper intercept it
// with a CJS mock, which works without --experimental-vm-modules.
// In production, the dynamic import runs as normal.
async function fileTypeFromBuffer(buffer) {
  const { fileTypeFromBuffer: detect } = await import('file-type');
  return detect(buffer);
}

module.exports = { fileTypeFromBuffer };
