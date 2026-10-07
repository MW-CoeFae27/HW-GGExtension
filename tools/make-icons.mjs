// Generates the extension icons (16/48/128 px) from a 16x16 pixel-art bolt. No dependencies.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ART = [
  'MMMMMMMMMMMMMMMM',
  'MbbbbbbbbbbbbbbM',
  'MbbbbbbbYYYbbbbM',
  'MbbbbbbYYYbbbsbM',
  'MbbbbbYYYbbbbbbM',
  'MbbbbYYYbbbbbbbM',
  'MbbbYYYYYYYbbbbM',
  'MbbbbbbYYYbbbbbM',
  'MbbbbbYYYbbbbbbM',
  'MbsbbYYYbbbbbbbM',
  'MbbbYYYbbbbbbbbM',
  'MbbbYYbbbbbbcbbM',
  'MbbbYbbbbbbbbbbM',
  'MbbbbbbbbbbbbbbM',
  'MbbbbbbbbbbbbbbM',
  'MMMMMMMMMMMMMMMM',
];
const PALETTE = { M: [232, 121, 249], b: [20, 10, 46], Y: [253, 224, 71], s: [34, 211, 238], c: [163, 230, 53] };

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const scale = size / ART.length;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = PALETTE[ART[Math.floor(y / scale)][Math.floor(x / scale)]];
      raw.set([r, g, b, 255], row + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = fileURLToPath(new URL('../extension/icons/', import.meta.url));
mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) writeFileSync(`${outDir}icon${size}.png`, png(size));
console.log('Icons written to', outDir);
