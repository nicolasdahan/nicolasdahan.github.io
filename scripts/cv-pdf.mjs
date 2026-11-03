import { chromium } from 'playwright-core';
import { serve } from '../lib/server.mjs';

const s = await serve();
const probe = await chromium.launch({ channel: 'chrome' });
const ua = (await probe.newPage().then((x) => x.evaluate(() => navigator.userAgent))).replace('HeadlessChrome', 'Chrome');
await probe.close();
const b = await chromium.launch({ channel: 'chrome', args: [`--user-agent=${ua}`] });
const c = await b.newContext({ javaScriptEnabled: false });
const p = await c.newPage();
await p.goto(`${s.url}/cv/`, { waitUntil: 'networkidle' });
await p.pdf({ path: '_site/cv/nicolas-dahan-cv.pdf', format: 'A4', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' }, printBackground: false });
await b.close(); s.close();
