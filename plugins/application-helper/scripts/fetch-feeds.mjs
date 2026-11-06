#!/usr/bin/env node
// Application Helper feed fetcher.
//
// Reads the companies under `ats_boards` in <workspace>/_profile/config.md, downloads each
// company's public job feed (Greenhouse, Lever, Ashby, Personio, SmartRecruiters, Workable),
// keeps postings that match the search terms, and writes them to <workspace>/feeds/.
// No model, no browser, no dependencies: Node 18 or later.
//
//   node fetch-feeds.mjs --workspace "C:\path\to\workspace"
//
// Options:
//   --workspace <dir>   workspace folder (holds _profile/config.md)
//   --config <file>     config file (default <workspace>/_profile/config.md)
//   --out <dir>         output folder (default <workspace>/feeds)
//   --terms "a, b"      search terms, overriding saved_searches
//   --locations "a, b"  location filter, overriding feed_locations
//   --only <slug>       fetch one board
//   --all               report every match as new (ignore what earlier runs saw)
//   --dry-run           print the result, write nothing
//   --verbose           log every request
//
// Output:
//   feeds/<yyyy-mm-dd>.json  postings first seen today (merged across runs of the day)
//   feeds/latest.json        every posting matching now, with the date it was first seen
//   feeds/state.json         what earlier runs saw, and the last result per board
//
// You run this script yourself, on your own computer, for your own job search. It sends one
// request per board (plus one per matching posting for SmartRecruiters and the Workable
// fallback), a quarter second apart.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERSION = '0.1.0';
const USER_AGENT = `application-helper-feeds/${VERSION}`;
const REQUEST_GAP_MS = 250;
const TIMEOUT_MS = 20000;
const DESCRIPTION_MAX = 12000;
const FORGET_AFTER_DAYS = 60;

// ---------- config ----------

// Collects the value of a top level key: the inline value plus the indented or "- " lines
// under it, up to the next top level key or heading. Comment lines are skipped.
export function configBlock(text, key) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inBlock = false;
  for (const raw of lines) {
    if (!inBlock) {
      const m = raw.match(new RegExp(`^${key}:\\s*(.*)$`));
      if (m) {
        inBlock = true;
        const inline = stripComment(` ${m[1]}`).trim();
        if (inline) out.push(inline);
      }
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^\S/.test(raw) && !raw.startsWith('- ')) break;
    out.push(stripComment(raw));
  }
  return out;
}

function stripComment(s) {
  return s.replace(/\s+#.*$/, '');
}

function splitList(s) {
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

export function parseConfig(text) {
  const boards = [];
  let cur = null;
  for (const line of configBlock(text, 'ats_boards')) {
    const item = line.match(/^\s*-\s+(.*)$/);
    const body = item ? item[1] : line.trim();
    if (item) {
      cur = {};
      boards.push(cur);
    }
    const kv = body.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv && cur) cur[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }

  const searches = [];
  for (const line of configBlock(text, 'saved_searches')) {
    const entry = line.replace(/^\s*-\s+/, '').trim();
    if (!entry) continue;
    const [terms = '', location = '', mode = ''] = entry.split('|').map(s => s.trim());
    searches.push({ terms: splitList(terms), location, mode });
  }

  const exclude = configBlock(text, 'exclude_terms')
    .flatMap(l => splitList(l.replace(/^\s*-\s+/, '')));
  const locations = configBlock(text, 'feed_locations')
    .flatMap(l => splitList(l.replace(/^\s*-\s+/, '')));

  return {
    boards: boards.filter(b => b.ats && b.slug).map(b => ({ ...b, ats: b.ats.toLowerCase() })),
    terms: [...new Set(searches.flatMap(s => s.terms))],
    exclude,
    locations,
  };
}

// ---------- text ----------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', hellip: '...', bull: '-', euro: '€', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' };

export function decodeEntities(s = '') {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function htmlToText(html = '') {
  let s = String(html);
  if (/&lt;\w/.test(s)) s = decodeEntities(s); // Greenhouse sends escaped HTML
  s = s
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<\/\s*(p|div|li|ul|ol|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(s)
    .split('\n')
    .map(l => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean) // one line per paragraph or item keeps the files compact
    .join('\n')
    .trim();
}

function normalizeText(s = '') {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

export function words(s = '') {
  return normalizeText(s)
    .split(/[^a-z0-9+#.]+/)
    .map(w => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
}

// A posting matches a term when every word of the term appears in the title or the
// description, and at least one of them is in the title. "kotlin backend" matches
// "Backend Engineer" with Kotlin in the description, but not "Data Analyst" with both
// words only in the description.
export function matchTerms(terms, title, description = '') {
  const t = new Set(words(title));
  const d = new Set(words(description));
  return terms.filter(term => {
    const tw = words(term);
    return tw.length > 0 && tw.every(w => t.has(w) || d.has(w)) && tw.some(w => t.has(w));
  });
}

export function titleMayMatch(terms, title) {
  const t = new Set(words(title));
  return terms.some(term => words(term).some(w => t.has(w)));
}

export function isExcluded(exclude, title) {
  const t = ` ${words(title).join(' ')} `;
  return exclude.some(x => {
    const xw = words(x).join(' ');
    return xw && t.includes(` ${xw} `);
  });
}

export function locationOk(locations, posting) {
  if (!locations.length) return true;
  if (posting.workMode === 'remote') return true;
  const loc = normalizeText(posting.location || '');
  return locations.some(l => {
    const n = normalizeText(l);
    return n === 'remote' ? /remote/.test(loc) : loc.includes(n);
  });
}

function clip(s) {
  return s.length > DESCRIPTION_MAX ? `${s.slice(0, DESCRIPTION_MAX)}\n[cut at ${DESCRIPTION_MAX} characters]` : s;
}

function workModeFrom(...hints) {
  const s = normalizeText(hints.filter(Boolean).join(' '));
  if (/hybrid/.test(s)) return 'hybrid';
  if (/remote|telecommut/.test(s)) return 'remote';
  if (/on.?site|office/.test(s)) return 'onsite';
  return undefined;
}

function isoDate(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ---------- http ----------

let verbose = false;
let lastRequest = 0;

async function http(url, { method = 'GET', body, accept = 'application/json' } = {}) {
  const wait = lastRequest + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  for (let attempt = 1; attempt <= 2; attempt++) {
    lastRequest = Date.now();
    if (verbose) console.error(`${method} ${url}`);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: accept,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if ((res.status === 429 || res.status >= 500) && attempt === 1) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return accept.includes('json') ? await res.json() : await res.text();
    } catch (err) {
      if (attempt === 2 || /HTTP 4\d\d/.test(err.message)) throw err;
      await sleep(2000);
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------- adapters ----------
// Each returns postings: { jobId, title, location, workMode, postedAt, url, applyUrl,
// description?, salary?, detail?: async () => ({ description, url?, applyUrl? }) }.
// Endpoints are the last known public ones; a board that fails is reported, not fatal.

export const adapters = {
  async greenhouse(b) {
    const data = await http(`https://boards-api.greenhouse.io/v1/boards/${b.slug}/jobs?content=true`);
    return (data.jobs || []).map(j => ({
      jobId: String(j.id),
      title: j.title,
      location: j.location?.name || '',
      workMode: workModeFrom(j.location?.name),
      postedAt: isoDate(j.first_published || j.updated_at),
      url: j.absolute_url,
      applyUrl: j.absolute_url,
      description: htmlToText(j.content),
    }));
  },

  async lever(b) {
    const host = b.region === 'eu' ? 'api.eu.lever.co' : 'api.lever.co';
    const data = await http(`https://${host}/v0/postings/${b.slug}?mode=json`);
    return (Array.isArray(data) ? data : []).map(p => ({
      jobId: p.id,
      title: p.text,
      location: p.categories?.allLocations?.join('; ') || p.categories?.location || '',
      workMode: workModeFrom(p.workplaceType, p.categories?.location),
      postedAt: isoDate(p.createdAt),
      url: p.hostedUrl,
      applyUrl: p.applyUrl || p.hostedUrl,
      salary: p.salaryRange ? `${p.salaryRange.min}-${p.salaryRange.max} ${p.salaryRange.currency || ''} ${p.salaryRange.interval || ''}`.trim() : undefined,
      description: [
        p.descriptionPlain || htmlToText(p.description),
        ...(p.lists || []).map(l => `${l.text}\n${htmlToText(l.content)}`),
        p.additionalPlain || '',
      ].filter(Boolean).join('\n\n'),
    }));
  },

  async ashby(b) {
    const data = await http(`https://api.ashbyhq.com/posting-api/job-board/${b.slug}?includeCompensation=true`);
    return (data.jobs || []).filter(j => j.isListed !== false).map(j => ({
      jobId: j.id,
      title: j.title,
      location: [j.location, ...(j.secondaryLocations || []).map(s => s.location)].filter(Boolean).join('; '),
      workMode: j.isRemote ? 'remote' : workModeFrom(j.workplaceType),
      postedAt: isoDate(j.publishedAt),
      url: j.jobUrl,
      applyUrl: j.applyUrl || j.jobUrl,
      salary: j.compensation?.compensationTierSummary || undefined,
      description: j.descriptionPlain || htmlToText(j.descriptionHtml),
    }));
  },

  async personio(b) {
    const host = `${b.slug}.jobs.personio.${b.tld || 'de'}`;
    const xml = await http(`https://${host}/xml?language=${b.language || 'en'}`, { accept: 'application/xml, text/xml' });
    return parsePersonio(xml, host);
  },

  async smartrecruiters(b) {
    const base = `https://api.smartrecruiters.com/v1/companies/${b.slug}/postings`;
    const all = [];
    for (let offset = 0; ; offset += 100) {
      const page = await http(`${base}?limit=100&offset=${offset}`);
      all.push(...(page.content || []));
      if (!page.content?.length || all.length >= (page.totalFound ?? 0) || offset > 2000) break;
    }
    return all.map(p => ({
      jobId: String(p.id),
      title: p.name,
      location: p.location?.fullLocation || [p.location?.city, p.location?.country].filter(Boolean).join(', '),
      workMode: p.location?.remote ? 'remote' : p.location?.hybrid ? 'hybrid' : undefined,
      postedAt: isoDate(p.releasedDate),
      url: `https://jobs.smartrecruiters.com/${b.slug}/${p.id}`,
      applyUrl: `https://jobs.smartrecruiters.com/${b.slug}/${p.id}`,
      detail: async () => {
        const d = await http(`${base}/${p.id}`);
        const sections = d.jobAd?.sections || {};
        return {
          description: ['companyDescription', 'jobDescription', 'qualifications', 'additionalInformation']
            .map(k => sections[k] && `${sections[k].title || ''}\n${htmlToText(sections[k].text)}`.trim())
            .filter(Boolean).join('\n\n'),
          url: d.postingUrl,
          applyUrl: d.applyUrl,
        };
      },
    }));
  },

  async workable(b) {
    try {
      const data = await http(`https://apply.workable.com/api/v1/widget/accounts/${b.slug}?details=true`);
      if (!Array.isArray(data.jobs)) throw new Error('no jobs list in widget response');
      return data.jobs.map(j => ({
        jobId: j.shortcode,
        title: j.title,
        location: [j.city, j.state, j.country].filter(Boolean).join(', '),
        workMode: j.telecommuting ? 'remote' : undefined,
        postedAt: isoDate(j.published_on || j.created_at),
        url: j.url || j.shortlink || `https://apply.workable.com/${b.slug}/j/${j.shortcode}/`,
        applyUrl: j.application_url || j.url,
        description: htmlToText(j.description),
      }));
    } catch (widgetErr) {
      if (verbose) console.error(`workable widget failed for ${b.slug}: ${widgetErr.message}; trying v3`);
      const results = [];
      let token;
      for (let i = 0; i < 20; i++) {
        const page = await http(`https://apply.workable.com/api/v3/accounts/${b.slug}/jobs`, {
          method: 'POST',
          body: { query: '', location: [], department: [], worktype: [], remote: [], ...(token ? { token } : {}) },
        });
        results.push(...(page.results || []));
        token = page.nextPage;
        if (!token) break;
      }
      return results.map(j => ({
        jobId: j.shortcode,
        title: j.title,
        location: [j.location?.city, j.location?.region, j.location?.country].filter(Boolean).join(', '),
        workMode: j.remote ? 'remote' : workModeFrom(j.workplace),
        postedAt: isoDate(j.published),
        url: `https://apply.workable.com/${b.slug}/j/${j.shortcode}/`,
        applyUrl: `https://apply.workable.com/${b.slug}/j/${j.shortcode}/apply/`,
        detail: async () => {
          const d = await http(`https://apply.workable.com/api/v2/accounts/${b.slug}/jobs/${j.shortcode}`);
          return { description: [d.description, d.requirements, d.benefits].map(htmlToText).filter(Boolean).join('\n\n') };
        },
      }));
    }
  },
};

function xmlTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  const inner = m[1].trim();
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return cdata ? cdata[1] : decodeEntities(inner);
}

function xmlAll(block, tag) {
  return [...block.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => m[0]);
}

export function parsePersonio(xml, host) {
  return xmlAll(xml, 'position').map(pos => {
    // nested blocks reuse tag names (<name>, <office>), so read the position's own fields
    // from the text with those blocks removed
    const descBlock = pos.match(/<jobDescriptions>[\s\S]*?<\/jobDescriptions>/)?.[0] || '';
    const officeBlock = pos.match(/<additionalOffices>[\s\S]*?<\/additionalOffices>/)?.[0] || '';
    const own = pos.replace(descBlock, '').replace(officeBlock, '');
    const id = xmlTag(own, 'id');
    const offices = [xmlTag(own, 'office'), ...xmlAll(officeBlock, 'office').map(o => xmlTag(o, 'office'))].filter(Boolean);
    const descriptions = xmlAll(descBlock, 'jobDescription').map(d => `${xmlTag(d, 'name')}\n${htmlToText(xmlTag(d, 'value'))}`.trim());
    const extra = ['employmentType', 'seniority', 'schedule', 'yearsOfExperience', 'keywords']
      .map(t => [t, xmlTag(own, t)]).filter(([, v]) => v).map(([t, v]) => `${t}: ${v}`);
    return {
      jobId: id,
      title: xmlTag(own, 'name'),
      location: [...new Set(offices)].join('; '),
      workMode: workModeFrom(offices.join(' '), xmlTag(own, 'keywords')),
      postedAt: isoDate(xmlTag(own, 'createdAt')),
      url: `https://${host}/job/${id}`,
      applyUrl: `https://${host}/job/${id}#apply`,
      description: [...descriptions, extra.join('\n')].filter(Boolean).join('\n\n'),
    };
  });
}

// ---------- run ----------

export async function runBoards({ boards, terms, exclude, locations }, state, { all = false, today } = {}) {
  const report = [];
  const matched = [];
  const now = new Date().toISOString();

  for (const b of boards) {
    const key = `${b.ats}/${b.slug}`;
    const adapter = adapters[b.ats];
    const entry = { board: key, company: b.name || b.slug, ok: false, total: 0, matched: 0, new: 0 };
    if (!adapter) {
      entry.error = `unknown ats "${b.ats}"`;
      report.push(entry);
      continue;
    }
    try {
      const postings = await adapter(b);
      entry.total = postings.length;
      for (const p of postings) {
        if (!p.title || isExcluded(exclude, p.title) || !titleMayMatch(terms, p.title)) continue;
        if (!locationOk(locations, p)) continue;
        if (p.detail && !p.description) {
          try {
            Object.assign(p, Object.fromEntries(Object.entries(await p.detail()).filter(([, v]) => v)));
          } catch (err) {
            p.description = '';
            p.detailError = err.message;
          }
        }
        const hits = matchTerms(terms, p.title, p.description);
        if (!hits.length && !p.detailError) continue;
        const id = `${key}/${p.jobId}`;
        const seen = state.seen[id];
        const posting = {
          id,
          ats: b.ats,
          slug: b.slug,
          company: b.name || b.slug,
          jobId: p.jobId,
          title: p.title,
          location: p.location || '',
          workMode: p.workMode,
          postedAt: p.postedAt,
          url: p.url,
          applyUrl: p.applyUrl || p.url,
          salary: p.salary,
          matchedTerms: hits,
          firstSeen: seen?.first || today,
          new: all || !seen,
          description: clip(p.description || ''),
          ...(p.detailError ? { note: `description not loaded: ${p.detailError}` } : {}),
        };
        state.seen[id] = { first: posting.firstSeen, last: today };
        matched.push(posting);
        entry.matched++;
        if (posting.new) entry.new++;
      }
      entry.ok = true;
      state.boards[key] = { lastOk: now, total: entry.total, matched: entry.matched };
    } catch (err) {
      entry.error = err.message;
      state.boards[key] = { ...(state.boards[key] || {}), lastError: now, error: err.message };
    }
    report.push(entry);
  }

  const cutoff = new Date(Date.now() - FORGET_AFTER_DAYS * 864e5).toISOString().slice(0, 10);
  for (const [id, s] of Object.entries(state.seen)) if (s.last < cutoff) delete state.seen[id];

  return { report, matched };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    if (['all', 'dry-run', 'verbose', 'help'].includes(k)) args[k] = true;
    else args[k] = argv[++i];
  }
  return args;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.workspace && !args.config)) {
    console.log('Usage: node fetch-feeds.mjs --workspace <folder> [--terms "a, b"] [--locations "a, b"] [--only <slug>] [--all] [--dry-run] [--verbose]');
    process.exit(args.help ? 0 : 1);
  }
  verbose = !!args.verbose;
  const configFile = args.config || path.join(args.workspace, '_profile', 'config.md');
  const outDir = args.out || path.join(args.workspace || path.dirname(path.dirname(configFile)), 'feeds');
  if (!existsSync(configFile)) {
    console.error(`Config not found: ${configFile}`);
    process.exit(1);
  }

  const cfg = parseConfig(await readFile(configFile, 'utf8'));
  if (args.terms) cfg.terms = splitList(args.terms);
  if (args.locations) cfg.locations = splitList(args.locations);
  if (args.only) cfg.boards = cfg.boards.filter(b => b.slug === args.only);
  if (!cfg.boards.length) {
    console.error('No ats_boards in config (each needs ats and slug).');
    process.exit(1);
  }
  if (!cfg.terms.length) {
    console.error('No search terms: add saved_searches to config or pass --terms.');
    process.exit(1);
  }

  const today = new Date().toLocaleDateString('sv'); // yyyy-mm-dd, local time
  const stateFile = path.join(outDir, 'state.json');
  const state = await readJson(stateFile, { seen: {}, boards: {} });
  state.seen ||= {};
  state.boards ||= {};

  const { report, matched } = await runBoards(cfg, state, { all: !!args.all, today });
  const fresh = matched.filter(p => p.new);

  for (const r of report) {
    const status = r.ok ? `${r.matched} matching of ${r.total}, ${r.new} new` : `FAILED: ${r.error}`;
    console.log(`${r.company.padEnd(28)} ${r.board.padEnd(32)} ${status}`);
  }
  console.log(`\n${fresh.length} new, ${matched.length} matching in total, ${report.filter(r => !r.ok).length} boards failed.`);

  if (args['dry-run']) {
    for (const p of fresh) console.log(`- ${p.company}: ${p.title} (${p.location || p.workMode || 'location not stated'}) ${p.url}`);
    return;
  }

  await mkdir(outDir, { recursive: true });
  const dayFile = path.join(outDir, `${today}.json`);
  const day = await readJson(dayFile, { date: today, runs: [], postings: [] });
  const known = new Set(day.postings.map(p => p.id));
  day.postings.push(...fresh.filter(p => !known.has(p.id)));
  day.runs.push({ at: new Date().toISOString(), terms: cfg.terms, locations: cfg.locations, boards: report });
  await writeFile(dayFile, JSON.stringify(day, null, 2));
  await writeFile(path.join(outDir, 'latest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), terms: cfg.terms, boards: report, postings: matched }, null, 2));
  await writeFile(stateFile, JSON.stringify(state, null, 2));
  console.log(`Wrote ${dayFile}`);

  if (report.every(r => !r.ok)) process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(err => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}
