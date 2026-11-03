import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { buildPhoto } from '../lib/photo.mjs';

const site = yaml.load(readFileSync('data/site.yaml', 'utf8'));
const out = 'src/assets/generated';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const photo = await buildPhoto('photo', `${out}/photo`, site.photo.focal);
if (!photo) console.warn('AVERTISSEMENT : photo/ est vide. La mise en page tient sans photo.');
else {
  const src = readdirSync('photo').find((f) => !f.startsWith('.'));
  const raw = readFileSync(`photo/${src}`);
  if (['c2pa', 'Exif', 'GPS', 'xpacket'].some((m) => raw.includes(m))) console.warn(`AVERTISSEMENT : photo/${src} contient des métadonnées, visibles dans le dépôt public. Retirez-les avant le commit.`);
}
writeFileSync(`${out}/photo.json`, JSON.stringify(photo));

const news = yaml.load(readFileSync('data/news.yaml', 'utf8')).map((n) => n.date).sort();
const now = new Date().toISOString().slice(0, 10);
const past = news.filter((d) => d <= now).pop();
if (past) {
  const [a, m] = past.split('-').map(Number);
  const age = (new Date().getFullYear() - a) * 12 + new Date().getMonth() + 1 - m;
  if (age > 6) console.warn(`AVERTISSEMENT : la dernière news date de ${past}, soit plus de 6 mois.`);
}
