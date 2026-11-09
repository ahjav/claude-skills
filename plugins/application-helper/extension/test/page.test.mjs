// Runs the page functions in Chromium the way chrome.scripting.executeScript does: the
// function's source is serialized and called in the page. Needs Playwright with Chromium.
// Run: node --test plugins/application-helper/extension/test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { readJobPosting, probeList, extractList } from '../lib/page.js';
import { guessProfile, profileHealth } from '../lib/profile.js';
import { fromJobPosting, fromCard } from '../lib/posting.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = name => pathToFileURL(path.join(here, 'fixtures', name)).href;

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch {
  try {
    ({ chromium } = createRequire(import.meta.url)('playwright')); // a global install
  } catch {
    chromium = null;
  }
}

const run = (page, fn, arg) => page.evaluate(`(${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})`);

test('page functions in Chromium', { skip: !chromium && 'playwright not installed' }, async t => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    for (const name of ['stepstone-like.html', 'linkedin-like.html', 'indeed-like.html']) {
      await t.test(`learn and extract: ${name}`, async () => {
        await page.goto(fixture(name));
        const probe = await run(page, probeList);
        assert.equal(probe.count, 5, JSON.stringify(probe.candidates.map(c => [c.card, c.count])));
        const matched = await page.evaluate(s => document.querySelectorAll(s).length, probe.candidates[0].card);
        assert.equal(matched, 5, `card selector ${probe.candidates[0].card} must match only the cards`);
        const profile = guessProfile(probe);
        const result = await run(page, extractList, profile);
        assert.equal(result.count, 5);
        assert.deepEqual(profileHealth(result), { ok: true });
        const titles = result.cards.map(c => c.title);
        assert.ok(titles.includes('Softwareentwickler Java (m/w/d)'), `${name}: ${JSON.stringify(titles)} with ${JSON.stringify(profile.fields)}`);
        const first = result.cards.find(c => c.title.startsWith('Backend-Entwickler'));
        assert.equal(first.company, 'Acme GmbH', `${name}: company via ${profile.fields.company}`);
        assert.match(first.location, /Berlin/, `${name}: location via ${profile.fields.location}`);
        assert.ok(first.posted, `${name}: date via ${profile.fields.date}`);
        assert.match(first.url, /^(https?|file):\/\//);
        const posting = fromCard(first, 'example.org', '2026-11-09');
        assert.equal(posting.kind, 'listing');
        assert.ok(!/utm_source|trackingId|refId/.test(posting.url), posting.url);
      });
    }

    await t.test('broken profile reports unhealthy', async () => {
      await page.goto(fixture('stepstone-like.html'));
      const result = await run(page, extractList, { card: 'article.does-not-exist', fields: {} });
      assert.equal(profileHealth(result).ok, false);
    });

    await t.test('JobPosting from a live page and from parsed HTML', async () => {
      await page.goto(fixture('ad-jsonld.html'));
      const read = await run(page, readJobPosting);
      assert.equal(read.postings.length, 1);
      const p = fromJobPosting(read.postings[0], read.url, '2026-11-09');
      assert.equal(p.title, 'Backend-Entwickler (m/w/d) Kotlin');
      assert.equal(p.company, 'Acme GmbH');
      assert.equal(p.location, 'Berlin, DE');
      assert.equal(p.jobId, '12345');
      assert.equal(p.salary, '60,000-72,000 EUR year');
      assert.equal(p.url, 'https://www.stepstone.de/stellenangebote--12345-inline.html');
      assert.match(p.description, /- Mindestens 3 Jahre Berufserfahrung/);
      assert.equal(p.signals.adLanguage, 'de');
      assert.equal(p.signals.minYears, 3);
      const de = p.signals.languages.find(l => l.lang === 'de');
      assert.deepEqual([de.level, de.required], ['c1', true]);

      // the same function on a document parsed from fetched HTML (the side panel does this)
      const viaParser = await page.evaluate(`(() => {
        const html = document.documentElement.outerHTML;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return (${readJobPosting.toString()})(doc).postings.length;
      })()`);
      assert.equal(viaParser, 1);

      await page.goto(fixture('ad-none.html'));
      assert.equal((await run(page, readJobPosting)).postings.length, 0);
    });
  } finally {
    await browser.close();
  }
});
