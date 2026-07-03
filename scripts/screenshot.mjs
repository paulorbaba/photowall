#!/usr/bin/env node
// Tira screenshots do telão e do painel para verificação visual.
// Requer o servidor rodando (npm start) com os apps buildados.
//
// Uso: node scripts/screenshot.mjs [baseUrl]

import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:4700';
const outDir = new URL('../screenshots/', import.meta.url).pathname;
fs.mkdirSync(outDir, { recursive: true });

const executablePath =
  process.env.PHOTOWALL_CHROMIUM ??
  (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const browser = await chromium.launch({
  executablePath,
  args: ['--no-sandbox', '--disable-gpu']
});

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${outDir}wall.png` });
console.log(`ok: ${outDir}wall.png`);

await page.goto(`${base}/admin/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}admin.png`, fullPage: true });
console.log(`ok: ${outDir}admin.png`);

await browser.close();
