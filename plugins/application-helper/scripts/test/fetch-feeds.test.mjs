// Run: node --test plugins/application-helper/scripts/test/
// Uses fixture payloads shaped like the real feeds; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseConfig, htmlToText, matchTerms, titleMayMatch, isExcluded, locationOk, parsePersonio, runBoards,
} from '../fetch-feeds.mjs';
import { installFetchMock } from './mock-fetch.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, '..', 'fetch-feeds.mjs');
const template = path.join(here, '..', '..', 'skills', 'setup', 'references', 'config.md');

const filledConfig = `# Application helper config

## ATS boards
# - name: Example GmbH
#   ats: greenhouse
#   slug: example
ats_boards:
  - name: Acme
    ats: greenhouse        # comment
    slug: acme
  - name: Lev Co
    ats: lever
    slug: levco
    region: eu
  - name: Ash
    ats: Ashby
    slug: ash
  - name: Pers GmbH
    ats: personio
    slug: pers
  - name: SR Inc
    ats: smartrecruiters
    slug: srinc
  - name: Work Ltd
    ats: workable
    slug: workltd
  - name: Broken
    ats: greenhouse
    slug: broken
  - name: no slug here
    ats: lever

## Portals
portals:
discovery_days: mon

## Searches
saved_searches:
  - kotlin backend, java engineer | Berlin | hybrid
  - backend engineer | Germany | remote
exclude_terms: working student, intern
feed_locations: Berlin, Germany, Remote
max_results_per_query: 30
`;

test('template config parses to no boards and no terms', async () => {
  const cfg = parseConfig(await readFile(template, 'utf8'));
  assert.deepEqual(cfg.boards, []);
  assert.deepEqual(cfg.terms, []);
});

test('filled config parses boards, terms, excludes, locations', () => {
  const cfg = parseConfig(filledConfig);
  assert.deepEqual(cfg.boards.map(b => `${b.ats}/${b.slug}`), [
    'greenhouse/acme', 'lever/levco', 'ashby/ash', 'personio/pers', 'smartrecruiters/srinc', 'workable/workltd', 'greenhouse/broken',
  ]);
  assert.equal(cfg.boards[1].region, 'eu');
  assert.deepEqual(cfg.terms, ['kotlin backend', 'java engineer', 'backend engineer']);
  assert.deepEqual(cfg.exclude, ['working student', 'intern']);
  assert.deepEqual(cfg.locations, ['Berlin', 'Germany', 'Remote']);
});

test('htmlToText handles escaped HTML, lists and entities', () => {
  const escaped = '&lt;p&gt;We use &lt;strong&gt;Kotlin&lt;/strong&gt; &amp;amp; Java.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Spring&lt;/li&gt;&lt;li&gt;AWS&lt;/li&gt;&lt;/ul&gt;';
  assert.equal(htmlToText(escaped), 'We use Kotlin & Java.\n- Spring\n- AWS');
  assert.equal(htmlToText('<p>Gr&uuml;n&#252;&nbsp;x</p><br>y'), 'Grünü x\ny');
  assert.equal(htmlToText('<p>&Uuml;ber uns &amp; Stra&szlig;e</p>'), 'Über uns & Straße');
});

test('matching rules', () => {
  const terms = ['kotlin backend', 'java engineer'];
  assert.deepEqual(matchTerms(terms, 'Backend Engineer', 'We write Kotlin.'), ['kotlin backend']);
  assert.deepEqual(matchTerms(terms, 'Data Analyst', 'kotlin backend java engineer'), []);
  assert.deepEqual(matchTerms(terms, 'Senior Java Engineer (m/w/d)', ''), ['java engineer']);
  assert.equal(titleMayMatch(terms, 'Frontend Developer'), false);
  assert.equal(titleMayMatch(['node.js developer'], 'Node.js Engineer'), true);
  assert.equal(isExcluded(['working student'], 'Working Student Backend'), true);
  assert.equal(isExcluded(['intern'], 'Internal Tools Engineer'), false);
  assert.equal(locationOk(['Berlin', 'Remote'], { location: 'Remote', workMode: 'remote' }), true);
  assert.equal(locationOk(['Germany', 'Remote'], { location: 'Remote, United States', workMode: 'remote' }), false);
  assert.equal(locationOk(['Germany', 'Remote'], { location: 'Remote - European Union', workMode: 'remote' }), true);
  assert.equal(locationOk(['Germany', 'Remote'], { location: 'Remote - European Union; Spain; Germany; Berlin' }), true);
  assert.equal(locationOk(['Germany'], { location: 'Remote', workMode: 'remote' }), false);
  assert.equal(locationOk(['Berlin'], { location: 'München, Germany' }), false);
  assert.equal(locationOk(['Germany'], { location: 'München, Germany' }), true);
  assert.equal(locationOk([], { location: 'Paris' }), true);
});

test('personio XML keeps title and office separate from nested blocks', () => {
  const xml = `<?xml version="1.0"?><workzag-jobs><position><id>123</id><office>Berlin</office>
    <additionalOffices><office>Hamburg</office></additionalOffices><name>Backend Engineer Kotlin</name>
    <jobDescriptions><jobDescription><name>Your tasks</name><value><![CDATA[<p>Build APIs</p>]]></value></jobDescription></jobDescriptions>
    <employmentType>permanent</employmentType><seniority>experienced</seniority><createdAt>2026-11-01T09:00:00+00:00</createdAt></position></workzag-jobs>`;
  const [p] = parsePersonio(xml, 'pers.jobs.personio.de');
  assert.equal(p.title, 'Backend Engineer Kotlin');
  assert.equal(p.location, 'Berlin; Hamburg');
  assert.match(p.description, /Your tasks\nBuild APIs/);
  assert.match(p.description, /seniority: experienced/);
  assert.equal(p.url, 'https://pers.jobs.personio.de/job/123');
});

test('all six adapters through runBoards, with seen state', async () => {
  const restore = installFetchMock();
  try {
    const cfg = parseConfig(filledConfig);
    const state = { seen: {}, boards: {} };
    const { report, matched } = await runBoards(cfg, state, { today: '2026-11-06' });
    const byBoard = Object.fromEntries(report.map(r => [r.board, r]));

    assert.equal(byBoard['greenhouse/broken'].ok, false);
    assert.match(byBoard['greenhouse/broken'].error, /404/);
    for (const k of ['greenhouse/acme', 'lever/levco', 'ashby/ash', 'personio/pers', 'smartrecruiters/srinc', 'workable/workltd']) {
      assert.equal(byBoard[k].ok, true, `${k}: ${byBoard[k].error}`);
      assert.equal(byBoard[k].matched, 1, `${k} should match exactly its backend role`);
    }
    const titles = matched.map(p => `${p.ats}: ${p.title}`).sort();
    assert.deepEqual(titles, [
      'ashby: Backend Engineer',
      'greenhouse: Backend Engineer, Payments',
      'lever: Senior Java Engineer',
      'personio: Backend Engineer Kotlin',
      'smartrecruiters: Backend Engineer',
      'workable: Backend Engineer',
    ]);
    const gh = matched.find(p => p.ats === 'greenhouse');
    assert.match(gh.description, /Kotlin/);
    assert.equal(gh.applyUrl, 'https://job-boards.greenhouse.io/acme/jobs/111');
    const sr = matched.find(p => p.ats === 'smartrecruiters');
    assert.match(sr.description, /Kotlin and Spring/);
    assert.equal(sr.applyUrl, 'https://jobs.smartrecruiters.com/srinc/999/apply');
    const ash = matched.find(p => p.ats === 'ashby');
    assert.equal(ash.workMode, 'remote');
    assert.equal(ash.salary, '€60K – €75K');
    assert.ok(matched.every(p => p.new && p.firstSeen === '2026-11-06'));

    const again = await runBoards(cfg, state, { today: '2026-11-07' });
    assert.ok(again.matched.every(p => !p.new && p.firstSeen === '2026-11-06'));
  } finally {
    restore();
  }
});

test('workable falls back to v3 when the widget fails', async () => {
  const restore = installFetchMock({ workableWidgetFails: true });
  try {
    const cfg = { ...parseConfig(filledConfig) };
    cfg.boards = cfg.boards.filter(b => b.ats === 'workable');
    const { report, matched } = await runBoards(cfg, { seen: {}, boards: {} }, { today: '2026-11-06' });
    assert.equal(report[0].ok, true, report[0].error);
    assert.equal(matched.length, 1);
    assert.match(matched[0].description, /Kotlin/);
    assert.equal(matched[0].applyUrl, 'https://apply.workable.com/workltd/j/ABC123/apply/');
  } finally {
    restore();
  }
});

test('CLI writes day, latest and state files and merges a second run', async () => {
  const ws = await mkdtemp(path.join(os.tmpdir(), 'ah-feeds-'));
  await mkdir(path.join(ws, '_profile'));
  await writeFile(path.join(ws, '_profile', 'config.md'), filledConfig);
  const preload = path.join(here, 'mock-fetch-preload.mjs');
  const run = () => execFileSync(process.execPath, ['--import', pathUrl(preload), script, '--workspace', ws], { encoding: 'utf8' });
  const out1 = run();
  assert.match(out1, /6 new, 6 matching in total, 1 boards failed/);
  const today = new Date().toLocaleDateString('sv');
  const day = JSON.parse(await readFile(path.join(ws, 'feeds', `${today}.json`), 'utf8'));
  assert.equal(day.postings.length, 6);
  const out2 = run();
  assert.match(out2, /0 new, 6 matching in total/);
  const day2 = JSON.parse(await readFile(path.join(ws, 'feeds', `${today}.json`), 'utf8'));
  assert.equal(day2.postings.length, 6);
  assert.equal(day2.runs.length, 2);
  const latest = JSON.parse(await readFile(path.join(ws, 'feeds', 'latest.json'), 'utf8'));
  assert.equal(latest.postings.length, 6);
});

function pathUrl(p) {
  return new URL(`file://${p.startsWith('/') ? '' : '/'}${p.replace(/\\/g, '/')}`).href;
}
