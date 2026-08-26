#!/usr/bin/env node

/**
 * Captures README screenshots of the production build.
 *
 * Spawns `vite preview` to serve dist/, captures the Home and Player pages
 * with headless Chromium, then optimizes both PNGs in place with sharp.
 *
 * Prerequisites:
 *   npm run build              (dist/ must exist)
 *   npx playwright install chromium
 */

import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const SHOTS = [
  { url: `${BASE_URL}/`, file: 'home.png', settle: 1200 },
  {
    url: `${BASE_URL}/#/play`,
    file: 'player.png',
    settle: 2500,
    moveMouse: true,
    seedSettings: { animationId: 'matrix' },
  },
];

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
});

preview.on('error', () => {
  console.error('Failed to start `vite preview`. Run `npm run build` first.');
  process.exit(1);
});

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  console.error(`Timed out waiting for ${BASE_URL}. Is dist/ built?`);
  preview.kill();
  process.exit(1);
};

try {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    console.error(
      `Chromium binaries are missing. Run \`npx playwright install chromium\` and retry.\n${error.message}`,
    );
    preview.kill();
    process.exit(1);
  }

  await waitForServer();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await mkdir(path.join(ROOT, 'docs'), { recursive: true });
  for (const shot of SHOTS) {
    if (shot.seedSettings) {
      await page.addInitScript((settings) => {
        localStorage.setItem('watchman-settings', JSON.stringify({ state: settings, version: 2 }));
      }, shot.seedSettings);
    }
    await page.goto(shot.url, { waitUntil: 'networkidle' });
    if (shot.seedSettings) {
      await page.reload({ waitUntil: 'networkidle' });
    }
    if (shot.moveMouse) {
      await page.mouse.move(640, 400);
    }
    await page.waitForTimeout(shot.settle);
    const target = path.join(ROOT, 'docs', shot.file);
    await page.screenshot({ path: target });
    console.log(`Captured ${shot.file}`);
  }

  await browser.close();

  for (const shot of SHOTS) {
    const target = path.join(ROOT, 'docs', shot.file);
    const optimized = await sharp(target)
      .resize({ width: 1280, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await writeFile(target, optimized);
    const { size } = await stat(target);
    console.log(`Optimized ${shot.file}: ${(size / 1024).toFixed(1)} KiB`);
  }
} finally {
  preview.kill();
}
