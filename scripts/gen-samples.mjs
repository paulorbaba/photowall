#!/usr/bin/env node
// Gera fotos de teste (PNGs coloridos) na pasta de ingestão, simulando
// convidados enviando fotos durante o evento. Sem dependências externas.
//
// Uso: node scripts/gen-samples.mjs [quantidade] [pastaDestino]

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const count = Number(process.argv[2] ?? 12);
const outDir = process.argv[3] ?? path.join(process.cwd(), 'data', 'incoming');

// ---- encoder PNG mínimo (RGB 8-bit) ----
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB

  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filtro none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      const i = rowStart + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- geração das imagens ----
const SIZE = 480;
const hsl = (h, s, l) => {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
};

fs.mkdirSync(outDir, { recursive: true });

for (let i = 0; i < count; i++) {
  const hue = Math.floor(Math.random() * 360);
  const hue2 = (hue + 60 + Math.random() * 120) % 360;
  const cx = SIZE * (0.3 + Math.random() * 0.4);
  const cy = SIZE * (0.3 + Math.random() * 0.4);
  const radius = SIZE * (0.14 + Math.random() * 0.12);

  const png = encodePng(SIZE, SIZE, (x, y) => {
    const t = (x + y) / (SIZE * 2);
    const inCircle = (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2;
    if (inCircle) return hsl(hue2, 0.85, 0.72);
    return hsl(hue + (hue2 - hue) * t, 0.7, 0.28 + 0.3 * t);
  });

  const name = `amostra-${String(i + 1).padStart(2, '0')}-${Date.now()}.png`;
  fs.writeFileSync(path.join(outDir, name), png);
  console.log(`gerada: ${path.join(outDir, name)}`);
}

console.log(`\n${count} fotos de teste em ${outDir}`);
