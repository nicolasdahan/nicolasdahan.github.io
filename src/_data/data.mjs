import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { loadBibFile } from '../../lib/bib.mjs';

const y = (f) => yaml.load(readFileSync(`data/${f}.yaml`, 'utf8'));
const site = y('site');
const pubs = loadBibFile('data/publications.bib');

const lastCommit = () => { try { return execSync('git log -1 --format=%cs', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const reversed = [...`${site.email_user}@${site.email_domain}`].reverse().join('');
const b64 = Buffer.from(reversed).toString('base64');
const cut = Math.floor(b64.length / 2);
const pho = 'src/assets/generated/photo.json';
const frFile = existsSync('data/fr.yaml') ? 'data/fr.yaml' : process.env.FR_FILE && existsSync(process.env.FR_FILE) ? process.env.FR_FILE : '';
const frOn = Boolean(frFile) && (site.fr_validated || Boolean(process.env.FR_FILE));

const newsBy = (a, b) => b.date.localeCompare(a.date);
const news = y('news').sort(newsBy).map((n) => {
  const p = n.key && pubs.find((x) => x.key === n.key);
  if (n.key && !p) throw new Error(`data/news.yaml : clé BibTeX inconnue : ${n.key}`);
  return { ...n, short: p ? p.short : '' };
});
const themes = [...new Set(pubs.map((p) => p.theme).filter(Boolean))];
const years = [...new Set(pubs.map((p) => p.year))];
const talks = y('talks').sort(newsBy);

export default {
  site: { ...site, status: [site.thesis.date ? `${site.defended ? 'Defended my PhD on' : 'Defending on'} ${site.thesis.date}.` : '', site.status].filter(Boolean).join(' '), updated: lastCommit(), emailA: b64.slice(0, cut), emailB: b64.slice(cut), frOn },
  pubs, news, themes, years, talks,
  scholarly: pubs.map((p) => ({ '@context': 'https://schema.org', '@type': 'ScholarlyArticle', headline: p.title, name: p.title, author: p.authors.map((name) => ({ '@type': 'Person', name })), datePublished: `${p.year}${p.month ? `-${String(p.month).padStart(2, '0')}` : ''}`, url: p.url, isPartOf: p.booktitle || p.venue, ...(p.abstract ? { abstract: p.abstract } : {}) })),
  sameAs: [...site.profiles.map((l) => l.url), ...(site.orcid ? [site.orcid] : [])],
  css: readFileSync('src/assets/css/site.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').trim(),
  resources: y('resources'), cv: y('cv'), abstract: y('abstract').en, fr: frFile ? yaml.load(readFileSync(frFile, 'utf8')) : null,
  photo: existsSync(pho) ? JSON.parse(readFileSync(pho, 'utf8')) : null,
};
