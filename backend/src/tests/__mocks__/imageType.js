'use strict';

// CJS mock for src/lib/imageType.js.
// Replaces the wrapper that calls await import('file-type') so that Jest's
// moduleNameMapper can intercept require('../lib/imageType') without needing
// --experimental-vm-modules. Reads the same magic bytes the real library
// would inspect, so the "wrong magic bytes → 400" test exercises the actual
// rejection path in processAndUploadImage.

async function fileTypeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  // WebP: RIFF....WEBP (bytes 0-3 = "RIFF", bytes 8-11 = "WEBP")
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null; // unrecognised → processAndUploadImage throws 400
}

module.exports = { fileTypeFromBuffer };
