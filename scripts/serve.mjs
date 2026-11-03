import { serve } from '../lib/server.mjs';
const s = await serve('_site', 8080);
console.log(`Site local : ${s.url}`);
