import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const input = 'public/logo.png';
const output = 'public/logo.webp';
await sharp(input)
  .resize({ width: 640, withoutEnlargement: true })
  .webp({ quality: 85, effort: 6 })
  .toFile(output);
console.log(`Logo: ${(await stat(input)).size} → ${(await stat(output)).size} bytes`);
