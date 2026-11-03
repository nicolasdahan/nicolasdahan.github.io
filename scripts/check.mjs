import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, join, relative } from 'node:path';
import yaml from 'js-yaml';

const ROOT = '_site';
const site = yaml.load(readFileSync('data/site.yaml', 'utf8'));
const cv = yaml.load(readFileSync('data/cv.yaml', 'utf8'));
const EMAIL = `${site.email_user}@${site.email_domain}`;
const fails = [];
const fail = (m) => fails.push(m);
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
if (!existsSync(ROOT)) { console.error('Pas de _site/ : lancez npm run build.'); process.exit(1); }
const files = walk(ROOT);
const TEXT = new Set(['.html', '.xml', '.txt', '.bib', '.css', '.js', '.svg']);
const KB = (n) => Math.round(n / 1024);

const PHONE = /(?:\+33[ .-]?|\b0)[1-9](?:[ .-]?\d{2}){4}\b/;
const MAILRE = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const SOURCES = new Set((existsSync('photo') ? readdirSync('photo').filter((x) => !x.startsWith('.')) : []).map((x) => hash(join('photo', x))));
const fromDir = (d, to) => (existsSync(d) ? walk(d).map((p) => join(to, relative(d, p))) : []);
const ALLOWED = new Set([...fromDir('public', ''), ...fromDir('src/assets', 'assets'), 'feed.xml', 'sitemap.xml', 'robots.txt', 'publications.bib', 'cv/nicolas-dahan-cv.pdf']);
for (const f of files) {
  const raw = readFileSync(f).toString('latin1');
  const name = relative(ROOT, f);
  if (raw.includes(EMAIL)) fail(`${name} : adresse en clair`);
  if (TEXT.has(extname(f)) && MAILRE.test(readFileSync(f, 'utf8'))) fail(`${name} : adresse e-mail en clair`);
  if (SOURCES.has(hash(f))) fail(`${name} : photo source publiée`);
  if (!name.endsWith('.html') && !ALLOWED.has(name)) fail(`${name} : fichier inattendu`);
  if (TEXT.has(extname(f))) {
    const noSvg = readFileSync(f, 'utf8').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/https?:\/\/[^\s"'<]+/g, ' ');
    if (extname(f) !== '.css' && extname(f) !== '.js' && extname(f) !== '.svg' && PHONE.test(noSvg)) fail(`${name} : numéro de téléphone`);
  }
}
for (const f of files.filter((x) => extname(x) === '.pdf')) {
  try {
    const t = execSync(`pdftotext "${f}" -`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    if (t.includes(EMAIL) || MAILRE.test(t) || PHONE.test(t)) fail(`${f} : donnée privée dans le PDF`);
  } catch { console.warn(`pdftotext absent : texte de ${f} non vérifié.`); }
}

const pages = files.filter((f) => extname(f) === '.html');
const urls = new Map();
const titles = new Map();
const descriptions = new Map();
for (const f of pages) {
  const name = relative(ROOT, f);
  const html = readFileSync(f, 'utf8');
  const body = html.replace(/<pre>[\s\S]*?<\/pre>/g, ' ').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ' ');
  for (const r of ['TODO', '{%', '{{', "\\'", '{\\', '$\\']) if (body.includes(r)) fail(`${name} : résidu « ${r} »`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="[^"]+"/.test(m[0])) fail(`${name} : image sans alt : ${m[0].slice(0, 80)}`);
    if (!/\bwidth="\d+"/.test(m[0]) || !/\bheight="\d+"/.test(m[0])) fail(`${name} : image sans dimensions`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { fail(`${name} : JSON-LD invalide`); } }
  const t = /<title>([^<]+)</.exec(html)?.[1];
  const de = /name="description" content="([^"]+)"/.exec(html)?.[1];
  if (!t || !de) fail(`${name} : titre ou description manquant`);
  if (name !== '404.html') {
    if (titles.has(t)) fail(`${name} : titre identique à ${titles.get(t)}`);
    titles.set(t, name);
    if (descriptions.has(de) && name !== '404.html') fail(`${name} : description identique à ${descriptions.get(de)}`);
    descriptions.set(de, name);
  }
  for (const r of ['rel="canonical"', 'og:image', 'og:title', 'og:description', 'og:url', 'og:type', 'twitter:card']) if (!html.includes(r)) fail(`${name} : ${r} manquant`);
  if (!site.fr_validated && !process.env.FR_FILE && /href="\/fr\//.test(html)) fail(`${name} : lien vers /fr/ non validé`);
  urls.set(`/${name}`, html);
}
if (!site.fr_validated && !process.env.FR_FILE && existsSync(join(ROOT, 'fr'))) fail('fr/ publié sans validation');

const idsOf = (h) => new Set([...h.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
for (const [name, html] of urls) {
  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|data:)/.test(u)) continue;
    const [path, hash] = u.split('#');
    const target = path ? (path.endsWith('/') ? `${path}index.html` : path) : name;
    if (path && !existsSync(join(ROOT, target))) { fail(`${name} : lien cassé ${u}`); continue; }
    if (hash) {
      const h = urls.get(target);
      if (h && !idsOf(h).has(hash)) fail(`${name} : ancre absente ${u}`);
    }
  }
  for (const m of html.matchAll(/\bsrcset="([^"]+)"/g)) for (const c of m[1].split(',')) { const p = c.trim().split(' ')[0]; if (!existsSync(join(ROOT, p))) fail(`${name} : image absente ${p}`); }
}

const size = (p) => statSync(join(ROOT, p)).size;
const fontDir = 'assets/fonts';
const fonts = readdirSync(join(ROOT, fontDir)).filter((f) => f.endsWith('.woff2')).reduce((n, f) => n + size(join(fontDir, f)), 0);
const css = size('assets/css/site.css');
const js = size('assets/js/main.js');
const homeFonts = readdirSync(join(ROOT, fontDir)).filter((f) => f.startsWith('be-vietnam')).reduce((n, f) => n + size(join(fontDir, f)), 0);
const photo = existsSync(join(ROOT, 'assets/generated/photo/portrait-320.avif')) ? size('assets/generated/photo/portrait-320.avif') : 0;
const home = size('index.html') + js + homeFonts + photo;
if (css > 15 * 1024) fail(`CSS : ${KB(css)} Ko pour 15`);
if (js > 5 * 1024) fail(`JS : ${KB(js)} Ko pour 5`);
if (fonts > 120 * 1024) fail(`Polices : ${KB(fonts)} Ko pour 120`);
if (home > 200 * 1024) fail(`Accueil : ${KB(home)} Ko pour 200`);

const words = (s) => s.trim().split(/\s+/).length;
if (words(cv.bio_50) !== 50) fail(`Bio courte : ${words(cv.bio_50)} mots`);
if (words(cv.bio_100) !== 100) fail(`Bio longue : ${words(cv.bio_100)} mots`);
for (const f of ['feed.xml', 'sitemap.xml', 'robots.txt', 'publications.bib', 'og.png', 'favicon.svg', 'cv/nicolas-dahan-cv.pdf', '404.html']) if (!existsSync(join(ROOT, f))) fail(`${f} manquant`);
const bib = readFileSync(join(ROOT, 'publications.bib'), 'utf8');
for (const c of ['venue_short', 'tldr', 'selected', 'abstract']) if (new RegExp(`^\\s*${c}\\s*=`, 'mi').test(bib)) fail(`publications.bib : champ ${c} exporté`);
let last = '';
try { last = execSync('git log -1 --format=%cs', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
if (!last) fail('Pas de commit : « Last updated » ne peut pas être daté.');
else if (!urls.get('/index.html').includes(`<time datetime="${last}">`)) fail(`« Last updated » ne correspond pas au dernier commit (${last})`);

console.log(`Accueil ${KB(home)} Ko, CSS ${KB(css)} Ko, JS ${KB(js)} Ko, polices ${KB(fonts)} Ko, photo ${KB(photo)} Ko.`);
if (fails.length) { console.error(`\n${fails.length} problème(s) :\n${[...new Set(fails)].map((f) => `  ${f}`).join('\n')}`); process.exit(1); }
console.log('Contrôle qualité : tout est bon.');
