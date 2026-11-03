import { readFileSync } from 'node:fs';

const svgOf = (file, key) => {
  const raw = readFileSync(`src/_includes/logos/${file}.svg`, 'utf8');
  const vb = (raw.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 68 46';
  const inner = [...raw.matchAll(/<path[\s\S]*?\/>|<path[\s\S]*?<\/path>/g)].map((m) => m[0].replace(/\sstyle="[^"]*"/, '').replace(/\sid="[^"]*"/, '').replace(/\sfill="[^"]*"/, '').replace(/\s+/g, ' ')).join('');
  return `<svg class="ic ic-${key}" viewBox="${vb}" fill="currentColor" aria-hidden="true" focusable="false">${inner}</svg>`;
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function (cfg) {
  cfg.addPassthroughCopy({ 'src/assets': 'assets', public: '/' });
  cfg.addWatchTarget('data/');
  cfg.addFilter('icon', (file, key) => svgOf(file, key || file));
  cfg.addFilter('shortdate', (d) => { const [y, m, j] = String(d).split('-'); return `${j ? `${+j} ` : ''}${MON[+m - 1]} ${y}`; });
  cfg.addFilter('longdate', (d) => { const [y, m, j] = String(d).split('-'); return `${j ? `${+j} ` : ''}${MONL[+m - 1]} ${y}`; });
  cfg.addFilter('rfc822', (d) => { const [y, m, j = '1'] = String(d).split('-'); return new Date(Date.UTC(+y, +m - 1, +j)).toUTCString(); });
  cfg.addFilter('jsonld', (o) => JSON.stringify(o).replace(/</g, '\\u003c'));
  cfg.addFilter('pubBy', (pubs, key) => pubs.find((p) => p.key === key));
  cfg.addFilter('xmlesc', (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
  cfg.addFilter('striptags', (s) => String(s).replace(/<[^>]+>/g, ''));
  cfg.addFilter('frnbsp', (s) => String(s).replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« '));
  return { dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' }, htmlTemplateEngine: 'njk', markdownTemplateEngine: false, templateFormats: ['njk'] };
}
