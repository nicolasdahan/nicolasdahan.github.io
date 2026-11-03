import { readFileSync } from 'node:fs';
import { parse } from '@retorquere/bibtex-parser/js';

export const CUSTOM = ['abstract', 'tldr', 'venue_short', 'status', 'short', 'theme', 'selected', 'code', 'data', 'terminology', 'poster', 'slides', 'video', 'hal', 'arxiv', 'pdf', 'example'];
export const STATUSES = ['published', 'under review', 'report', 'thesis'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function rawEntries(text) {
  const out = [];
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 1;
    let i = re.lastIndex;
    for (; i < text.length && depth; i++) {
      if (text[i] === '\\') { i++; continue; }
      if (text[i] === '{') depth++;
      if (text[i] === '}') depth--;
    }
    out.push({ type: m[1], key: m[2], raw: text.slice(m.index, i) });
    re.lastIndex = i;
  }
  return out;
}

function dropField(raw, name) {
  const re = new RegExp(`(^|[\\s,])${name}\\s*=\\s*`, 'i');
  const m = re.exec(raw);
  if (!m) return raw;
  const start = m.index + m[1].length;
  let i = m.index + m[0].length;
  if (raw[i] === '{') {
    let depth = 0;
    for (; i < raw.length; i++) {
      if (raw[i] === '\\') { i++; continue; }
      if (raw[i] === '{') depth++;
      if (raw[i] === '}' && --depth === 0) { i++; break; }
    }
  } else if (raw[i] === '"') {
    i++;
    for (; i < raw.length && raw[i] !== '"'; i++) if (raw[i] === '\\') i++;
    i++;
  } else {
    while (i < raw.length && /[^,\n]/.test(raw[i])) i++;
  }
  while (raw[i] === ' ' || raw[i] === '\t') i++;
  if (raw[i] === ',') i++;
  while (raw[i] === ' ' || raw[i] === '\t') i++;
  if (raw[i] === '\n') i++;
  return raw.slice(0, start) + raw.slice(i);
}

export const exportEntry = (raw) => {
  let r = raw;
  for (const f of CUSTOM) r = dropField(r, f);
  return `${r.replace(/\s*\}\s*$/, '').replace(/,\s*$/, '')}\n}`;
};

const nfc = (s) => String(s).normalize('NFC');
const nameOf = (a) => nfc(a.literal ? a.literal : [a.firstName, a.prefix, a.lastName, a.suffix].filter(Boolean).join(' '));

export function loadPublications(text, { me = 'Dahan' } = {}) {
  const raws = rawEntries(text);
  const keys = raws.map((r) => r.key);
  const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (dup.length) throw new Error(`publications.bib: clé en double : ${[...new Set(dup)].join(', ')}`);
  const low = keys.map((k) => k.toLowerCase());
  const clash = low.filter((k, i) => low.indexOf(k) !== i);
  if (clash.length) throw new Error(`publications.bib: clés en collision : ${[...new Set(clash)].join(', ')}`);

  const parsed = parse(text, { english: false, sentenceCase: false, guessAlreadySentenced: false, verbatimFields: ['url', 'code', 'data', 'terminology', 'poster', 'slides', 'video', 'hal', 'arxiv', 'pdf'] });
  if (parsed.errors?.length) throw new Error(`publications.bib: ${parsed.errors.map((e) => e.message || e.error).join('; ')}`);

  const entries = parsed.entries.map((e) => {
    const raw = raws.find((r) => r.key === e.key);
    if (!raw) throw new Error(`publications.bib: entrée introuvable : ${e.key}`);
    const f = e.fields;
    const one = (k) => { const v = f[k]; if (v === undefined) return ''; return nfc(Array.isArray(v) ? v[0] : v).trim(); };
    const authors = (f.author || []).map(nameOf);
    for (const [k, v] of [['title', one('title')], ['author', authors.length], ['year', one('year')], ['venue_short', one('venue_short')], ['status', one('status')]]) {
      if (!v) throw new Error(`publications.bib: ${e.key} n'a pas de champ ${k}`);
    }
    if (!STATUSES.includes(one('status'))) throw new Error(`publications.bib: ${e.key}: statut inconnu « ${one('status')} »`);
    const url = one('url');
    const anthology = /aclanthology\.org/.test(url) ? url : '';
    const monthRaw = (/(?:^|[\s,])month\s*=\s*["{]?(\w+)/i.exec(raw.raw)?.[1] || '').toLowerCase().slice(0, 3);
    const monthIdx = MONTHS.indexOf(monthRaw);
    return {
      key: e.key,
      type: e.type,
      title: one('title'),
      short: one('short') || one('title'),
      authors,
      authorsMarked: authors.map((a) => ({ name: a, me: a.endsWith(me) })),
      firstAuthor: authors[0].endsWith(me),
      year: +one('year'),
      month: monthIdx + 1,
      venue: one('venue_short'),
      booktitle: one('booktitle') || one('institution'),
      status: one('status'),
      showStatus: !['published', 'report'].includes(one('status')),
      theme: one('theme'),
      selected: one('selected') === 'true',
      tldr: one('tldr'),
      abstract: one('abstract'),
      example: one('example'),
      url,
      links: {
        anthology,
        pdf: one('pdf') || (anthology ? `${anthology.replace(/\/$/, '')}.pdf` : ''),
        arxiv: one('arxiv'), hal: one('hal'), code: one('code'), data: one('data'), terminology: one('terminology'), poster: one('poster'), slides: one('slides'), video: one('video'),
      },
      bibtex: exportEntry(raw.raw),
    };
  });
  return entries.sort((a, b) => b.year - a.year || b.month - a.month);
}

export const loadBibFile = (path) => loadPublications(readFileSync(path, 'utf8'));
