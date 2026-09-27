import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'public', 'icons');
const logo = path.join(rootDir, 'public', 'logo.png');

const maskableBackground = { r: 10, g: 10, b: 10, alpha: 1 };
const maskableLogoRatio = 0.66;
const sizes = [192, 512];

async function generateIcon(size) {
  const file = path.join(outDir, `icon-${size}.png`);
  await sharp(logo).resize(size, size, { fit: 'cover' }).png().toFile(file);
  return file;
}

async function generateMaskableIcon(size) {
  const logoSize = Math.round(size * maskableLogoRatio);
  const safeLogo = await sharp(logo).resize(logoSize, logoSize, { fit: 'cover' }).png().toBuffer();
  const file = path.join(outDir, `icon-maskable-${size}.png`);
  await sharp({
    create: { width: size, height: size, channels: 4, background: maskableBackground },
  })
    .composite([{ input: safeLogo, gravity: 'center' }])
    .png()
    .toFile(file);
  return file;
}

await mkdir(outDir, { recursive: true });
await sharp(logo)
  .resize(64, 64, { fit: 'cover' })
  .png()
  .toFile(path.join(rootDir, 'public', 'favicon.png'));
for (const size of sizes) {
  await generateIcon(size);
  await generateMaskableIcon(size);
}
console.log(`Generated favicon and ${sizes.length * 2} icons`);
