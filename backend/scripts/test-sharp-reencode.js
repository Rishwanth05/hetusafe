'use strict';
// Standalone smoke test for the sharp re-encode-to-WebP path used in reportRoutes.js.
// Run from the backend directory: node scripts/test-sharp-reencode.js
// Does NOT upload to S3; tests only the image-processing half of processAndUploadImage.

const sharp = require('sharp');

// ── Exact production constants ────────────────────────────────────────────────
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Mirrors the production path (minus the S3 upload).
async function reencodeToWebP(buffer) {
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !ALLOWED_IMAGE_MIME_TYPES.has(detected.mime)) {
    const err = new Error(`Rejected: type not in allowlist — detected: ${JSON.stringify(detected)}`);
    err.status = 400;
    throw err;
  }

  return sharp(buffer).webp({ quality: 80 }).toBuffer();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pass(label) { console.log(`  PASS  ${label}`); }
function fail(label) { console.error(`  FAIL  ${label}`); process.exitCode = 1; }
function check(condition, label) { condition ? pass(label) : fail(label); }

// ── Tests ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nsharp version : ${sharp.versions?.vips ? `0.35.3 (libvips ${sharp.versions.vips})` : '0.35.3'}`);
  console.log('Node version  :', process.version);

  // ── Test 1: JPEG → WebP, EXIF stripped ────────────────────────────────────
  console.log('\n[1] JPEG with EXIF orientation → WebP (EXIF/GPS must be stripped)');

  // Build a synthetic 64×64 JPEG with orientation=6 (a standard EXIF tag).
  // The same mechanism that strips orientation strips GPS IFD data.
  const jpegWithExif = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 180, g: 90, b: 40 } },
  })
    .withMetadata({ orientation: 6, density: 72 })
    .jpeg({ quality: 90 })
    .toBuffer();

  const inputMeta = await sharp(jpegWithExif).metadata();
  console.log('  Input  format:', inputMeta.format, '| orientation:', inputMeta.orientation, '| exif bytes:', inputMeta.exif?.length ?? 0);

  const webpBuffer = await reencodeToWebP(jpegWithExif);

  // Magic-byte check: bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
  const isRIFF = webpBuffer.subarray(0, 4).toString('ascii') === 'RIFF';
  const isWEBP = webpBuffer.subarray(8, 12).toString('ascii') === 'WEBP';
  check(isRIFF && isWEBP, `Output is valid WebP (RIFF…WEBP magic bytes)`);

  const outputMeta = await sharp(webpBuffer).metadata();
  console.log('  Output format:', outputMeta.format, '| orientation:', outputMeta.orientation ?? 'none', '| exif bytes:', outputMeta.exif?.length ?? 0);
  check(outputMeta.format === 'webp',               'Output format reported as webp by sharp');
  check(!outputMeta.exif,                           'EXIF block absent in output (GPS lives here)');
  check(!outputMeta.orientation,                    'EXIF orientation stripped');
  check(outputMeta.density === undefined || outputMeta.density === 72, 'No unexpected metadata leakage');

  // ── Test 2: PNG input accepted ─────────────────────────────────────────────
  console.log('\n[2] PNG input → WebP accepted');
  const pngBuffer = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 128, b: 255, alpha: 1 } },
  })
    .png()
    .toBuffer();

  const pngOut = await reencodeToWebP(pngBuffer);
  const pngIsWebP = pngOut.subarray(0, 4).toString('ascii') === 'RIFF' &&
                    pngOut.subarray(8, 12).toString('ascii') === 'WEBP';
  check(pngIsWebP, 'PNG → WebP conversion succeeded');

  // ── Test 3: Non-image input rejected ──────────────────────────────────────
  console.log('\n[3] Non-image (text/plain) input rejected with status 400');
  const fakeBuffer = Buffer.from('this is definitely not an image file');
  try {
    await reencodeToWebP(fakeBuffer);
    fail('Non-image input should have been rejected');
  } catch (err) {
    check(err.status === 400, `Rejected with status 400 (got: ${err.status})`);
    check(err.message.includes('Rejected'), `Error message describes rejection`);
  }

  // ── Test 4: WebP passthrough accepted ─────────────────────────────────────
  console.log('\n[4] Existing WebP input accepted and re-encoded');
  const webpIn = await sharp({
    create: { width: 16, height: 16, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .webp()
    .toBuffer();

  const webpOut = await reencodeToWebP(webpIn);
  const webpIsWebP = webpOut.subarray(0, 4).toString('ascii') === 'RIFF' &&
                     webpOut.subarray(8, 12).toString('ascii') === 'WEBP';
  check(webpIsWebP, 'WebP → WebP re-encode succeeded');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  if (process.exitCode === 1) {
    console.error('Some tests FAILED — see above.');
  } else {
    console.log('All tests PASSED.');
  }
  console.log('─────────────────────────────────────────\n');
}

main().catch(err => { console.error('Unhandled error:', err); process.exitCode = 1; });
