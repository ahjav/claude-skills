// Loads the real extension in Chromium and runs the side panel flow against a local server:
// read a results page, save listings, read the ads in the background, keep the profile, and
// capture the page for Claude. The workspace is an origin-private folder standing in for the
// folder the user picks (same handle API). Host access is granted up front in a test copy of
// the manifest, since permission prompts cannot be clicked here.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.join(here, '..');

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { chromium = null; }
}

const CONFIG = `# config
## Searches
saved_searches:
  backend engineer | Germany | any
  softwareentwickler | Germany | any   # local: de
  java developer | Germany | any
exclude_terms: working student, intern
`;

test('extension side panel end to end', { skip: !chromium && 'playwright not installed', timeout: 120000 }, async () => {
  const fixtures = path.join(here, 'fixtures');
  const server = http.createServer(async (req, res) => {
    const file = req.url.startsWith('/stellenangebote--') ? 'ad-jsonld.html' : req.url.replace(/^\//, '').split('?')[0];
    try {
      const body = await readFile(path.join(fixtures, file));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const copy = await mkdtemp(path.join(os.tmpdir(), 'ah-ext-'));
  await cp(extDir, copy, { recursive: true, filter: src => !src.includes(`${path.sep}test`) });
  const manifest = JSON.parse(await readFile(path.join(copy, 'manifest.json'), 'utf8'));
  manifest.host_permissions = ['http://127.0.0.1/*'];
  await writeFile(path.join(copy, 'manifest.json'), JSON.stringify(manifest));

  const userData = await mkdtemp(path.join(os.tmpdir(), 'ah-profile-'));
  const context = await chromium.launchPersistentContext(userData, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${copy}`, `--load-extension=${copy}`],
  });
  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extId = new URL(worker.url()).host;

    const site = await context.newPage();
    await site.goto(`${base}/stepstone-like.html`);
    const panel = await context.newPage();
    await panel.goto(`chrome-extension://${extId}/sidepanel.html`);
    await panel.waitForFunction(() => globalThis.__applicationHelper);

    // workspace with a config, in the origin-private file system
    await panel.evaluate(async config => {
      const root = await navigator.storage.getDirectory();
      const prof = await root.getDirectoryHandle('_profile', { create: true });
      const w = await (await prof.getFileHandle('config.md', { create: true })).createWritable();
      await w.write(config);
      await w.close();
      await globalThis.__applicationHelper.useRoot(root);
      const [tab] = await chrome.tabs.query({ url: 'http://127.0.0.1/*' });
      await globalThis.__applicationHelper.analyze(tab);
    }, CONFIG);

    await panel.waitForSelector('text=5 listings');
    assert.match(await panel.textContent('#workspace-name'), /3 terms/);
    assert.match(await panel.textContent('#page-body'), /3 match your search terms/); // QA Engineer and Fullstack Developer do not

    await panel.click('text=Save and read 3 ads');
    await panel.waitForSelector('text=/Read 3 ads in full/', { timeout: 30000 });
    await panel.click('text=Keep this profile');
    await panel.click('text=Ask Claude to map this page');
    await panel.waitForSelector('text=/Captured the page structure/');

    const files = await panel.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const read = async p => {
        let d = root;
        const parts = p.split('/');
        for (const x of parts.slice(0, -1)) d = await d.getDirectoryHandle(x);
        return JSON.parse(await (await (await d.getFileHandle(parts.at(-1))).getFile()).text());
      };
      const date = new Date().toLocaleDateString('sv');
      return {
        day: await read(`feeds/browser-${date}.json`),
        profile: await read('_profile/portals/127.0.0.1:' + location.port + '.json').catch(() => null),
        portals: await (async () => { const names = []; for await (const [n] of (await (await root.getDirectoryHandle('_profile')).getDirectoryHandle('portals')).entries()) names.push(n); return names; })(),
      };
    });
    const { day } = files;
    assert.equal(day.postings.length, 5);
    const ads = day.postings.filter(p => p.kind === 'ad');
    const listings = day.postings.filter(p => p.kind === 'listing');
    assert.equal(ads.length, 3, JSON.stringify(day.postings.map(p => [p.kind, p.title, p.note])));
    assert.deepEqual(listings.map(l => l.title).sort(), ['Fullstack Developer', 'QA Engineer']);
    assert.ok(ads.every(a => a.description.includes('Berufserfahrung') && a.signals.languages.some(l => l.lang === 'de' && l.level === 'c1')));
    assert.ok(day.postings.every(p => !/utm_source/.test(p.url)));
    assert.deepEqual(day.runs.map(r => r.kind), ['list', 'read-ads']);
    assert.ok(files.portals.some(n => n.endsWith('.json') && n.startsWith('127.0.0.1')), files.portals.join(','));
    assert.ok(files.portals.includes('_pending'));
  } finally {
    await context.close();
    server.close();
  }
});
