import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'public', 'icons');

const logoSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">',
  '  <circle cx="32" cy="32" r="18" fill="none" stroke="#38bdf8" stroke-width="4" />',
  '  <circle cx="32" cy="32" r="7" fill="#38bdf8" />',
  '</svg>',
].join('\n');

const maskableBackground = { r: 10, g: 10, b: 10, alpha: 1 };
const maskableLogoRatio = 0.66;
const sizes = [192, 512];

async function generateIcon(size) {
  const file = path.join(outDir, `icon-${size}.png`);
  await sharp(Buffer.from(logoSvg)).resize(size, size).png().toFile(file);
  return file;
}

async function generateMaskableIcon(size) {
  const logoSize = Math.round(size * maskableLogoRatio);
  const logo = await sharp(Buffer.from(logoSvg)).resize(logoSize, logoSize).png().toBuffer();
  const file = path.join(outDir, `icon-maskable-${size}.png`);
  await sharp({
    create: { width: size, height: size, channels: 4, background: maskableBackground },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(file);
  return file;
}

await mkdir(outDir, { recursive: true });
for (const size of sizes) {
  await generateIcon(size);
  await generateMaskableIcon(size);
}
console.log(`Generated ${sizes.length * 2} icons in public/icons`);
