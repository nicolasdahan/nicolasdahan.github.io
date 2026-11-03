import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createGzip } from 'node:zlib';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf', '.xml': 'application/xml', '.bib': 'text/plain; charset=utf-8', '.txt': 'text/plain' };
export const serve = (root = '_site', port = 0) => new Promise((ok) => {
  const srv = createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = join(root, normalize(u));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    if (!existsSync(f)) { res.writeHead(404, { 'content-type': TYPES['.html'] }); createReadStream(join(root, '404.html')).pipe(res); return; }
    const type = TYPES[extname(f)] || 'application/octet-stream';
    if (/gzip/.test(req.headers['accept-encoding'] || '') && /text|javascript|xml|svg/.test(type)) {
      res.writeHead(200, { 'content-type': type, 'content-encoding': 'gzip' });
      createReadStream(f).pipe(createGzip()).pipe(res);
      return;
    }
    res.writeHead(200, { 'content-type': type });
    createReadStream(f).pipe(res);
  });
  srv.listen(port, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() }));
});
