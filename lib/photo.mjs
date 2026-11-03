import { readdirSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const IMG = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const WIDTHS = [160, 320];
export const RATIO = 5 / 4;

export function findPhoto(dir) {
  const files = readdirSync(dir).filter((f) => !f.startsWith('.') && IMG.has(extname(f).toLowerCase()));
  if (files.length > 1) throw new Error(`photo/ contient plusieurs images (${files.join(', ')}). Laissez-en une seule.`);
  return files.length ? join(dir, files[0]) : null;
}

const focalBox = (w, h, focal) => {
  const [fx, fy] = String(focal || '50% 50%').split(/\s+/).map((v) => parseFloat(v) / 100);
  const cw = Math.min(w, Math.floor(h / RATIO));
  const ch = Math.min(h, Math.floor(cw * RATIO));
  return { left: Math.round((w - cw) * fx), top: Math.round((h - ch) * fy), width: cw, height: ch };
};

export async function buildPhoto(dir, outDir, focal) {
  const src = findPhoto(dir);
  if (!src) return null;
  mkdirSync(outDir, { recursive: true });
  const meta = await sharp(src).rotate().toBuffer({ resolveWithObject: true });
  const box = focalBox(meta.info.width, meta.info.height, focal);
  const out = [];
  for (const w of WIDTHS) {
    const h = Math.round(w * RATIO);
    const base = sharp(meta.data).extract(box).resize(w, h);
    await base.clone().avif({ quality: 68 }).toFile(join(outDir, `portrait-${w}.avif`));
    await base.clone().webp({ quality: 85 }).toFile(join(outDir, `portrait-${w}.webp`));
    out.push({ w, h });
  }
  return { widths: out };
}
