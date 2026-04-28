#!/usr/bin/env node
/**
 * Generates apps/desktop/build/icon.png — a 512×512 PNG with Tikke's
 * diamond logo (cyan-to-pink gradient on a near-black background).
 *
 * Uses only Node built-ins (no extra deps).
 * Run: node apps/desktop/scripts/gen-icon.mjs
 */
import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIZE = 512;
const OUT = join(__dirname, "../build/icon.png");

// ── pixel buffer (RGB, no alpha) ──────────────────────────────────────────
const rgb = Buffer.alloc(SIZE * SIZE * 3);

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 3;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const dx = Math.abs(x - cx) / (SIZE * 0.38);
    const dy = Math.abs(y - cy) / (SIZE * 0.38);
    const inDiamond = dx + dy < 1;

    if (inDiamond) {
      // Cyan (#00F2EA) → Pink (#FF0050) horizontal gradient
      const t = (x - (cx - SIZE * 0.38)) / (SIZE * 0.76);
      const tc = Math.max(0, Math.min(1, t));
      rgb[idx]     = Math.round(0   + tc * 255);   // R
      rgb[idx + 1] = Math.round(242 * (1 - tc));    // G
      rgb[idx + 2] = Math.round(234 * (1 - tc) + 80 * tc); // B
    } else {
      // Background: very dark blue-black
      const vignette = 1 - Math.sqrt(((x - cx) / cx) ** 2 + ((y - cy) / cy) ** 2) * 0.25;
      rgb[idx]     = Math.round(5  * vignette);
      rgb[idx + 1] = Math.round(5  * vignette);
      rgb[idx + 2] = Math.round(20 * vignette);
    }
  }
}

// ── PNG encoder ───────────────────────────────────────────────────────────
function crc32(buf) {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = t[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const payload = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(payload));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB truecolor

// One filter-byte (None=0) per scanline
const raw = Buffer.alloc(SIZE * (1 + SIZE * 3));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 3 + 1)] = 0;
  rgb.copy(raw, y * (SIZE * 3 + 1) + 1, y * SIZE * 3, (y + 1) * SIZE * 3);
}

const idat = deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(join(__dirname, "../build"), { recursive: true });
writeFileSync(OUT, png);
console.log(`✓ icon.png generated: ${OUT} (${png.length} bytes)`);
