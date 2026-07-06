#!/usr/bin/env node
// Screenshots de verificação da v2.1: telão com logo, página /upload (mobile)
// e tela de login do admin.

import fs from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:4700';
const outDir = new URL('../screenshots/', import.meta.url).pathname;
fs.mkdirSync(outDir, { recursive: true });

const executablePath =
  process.env.PHOTOWALL_CHROMIUM ??
  (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });

// Telão em 1080p
const wall = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await wall.goto(`${base}/`, { waitUntil: 'networkidle' });
await wall.waitForTimeout(3500);
await wall.screenshot({ path: `${outDir}wall-logo.png` });
console.log(`ok: ${outDir}wall-logo.png`);
await wall.close();

// Página de upload em viewport de celular
const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true
});
await phone.goto(`${base}/upload`, { waitUntil: 'networkidle' });
await phone.waitForTimeout(800);
await phone.screenshot({ path: `${outDir}upload-mobile.png` });
console.log(`ok: ${outDir}upload-mobile.png`);
await phone.close();

// Tela de login do admin
const admin = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await admin.goto(`${base}/admin/`, { waitUntil: 'networkidle' });
await admin.waitForTimeout(1500);
await admin.screenshot({ path: `${outDir}admin-login.png` });
console.log(`ok: ${outDir}admin-login.png`);

await browser.close();
