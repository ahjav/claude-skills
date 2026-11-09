import { readJobPosting, probeList, extractList } from './lib/page.js';
import { fromJobPosting, fromCard } from './lib/posting.js';
import { guessProfile, profileFor, profileHealth } from './lib/profile.js';
import { savedWorkspace, connectWorkspace, ensurePermission, readJsonDir, writeJson, savePostings } from './lib/store.js';
import { searchConfig, worthReading, searchPlan, searchUrl } from './lib/config.js';

const $ = id => document.getElementById(id);
const today = () => new Date().toLocaleDateString('sv');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const state = { root: null, ready: false, profiles: {}, search: { terms: [], exclude: [] }, plan: { portals: [], terms: [] }, tab: null, view: null, current: null };
const picks = { portalsOff: [], termsOff: [], date: '', done: [], initialized: false };
const settings = { linkedin: false, cap: 30 };

function log(msg, cls = '') {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
  if (cls) li.className = cls;
  $('log').prepend(li);
}

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'onclick') n.addEventListener('click', v);
    else if (k === 'class') n.className = v;
    else n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) n.append(c);
  return n;
}

// ---------- workspace ----------

async function loadWorkspace(interactive) {
  const root = state.root || (await savedWorkspace());
  state.root = root;
  state.ready = !!root && (await ensurePermission(root, interactive));
  if (state.ready) {
    state.profiles = await readJsonDir(root, '_profile/portals');
    try {
      const cfg = await (await (await root.getDirectoryHandle('_profile')).getFileHandle('config.md')).getFile();
      const text = await cfg.text();
      state.search = searchConfig(text);
      state.plan = searchPlan(text);
    } catch { /* keep defaults */ }
  }
  renderWorkspace();
  renderPlan();
}

// ---------- searches: the user's portals x saved terms ----------

const searchKey = (portal, term) => `${portal}|${term}`;

function queue() {
  const portals = state.plan.portals.filter(p => !picks.portalsOff.includes(p.name));
  const terms = state.plan.terms.filter(t => !picks.termsOff.includes(t.term));
  // one portal at a time, so sign-ins and cookie banners are dealt with once
  return portals.flatMap(p => terms.map(t => ({ portal: p.name, term: t.term, url: searchUrl(p.template, t.term, t.location) })));
}

async function savePicks() {
  await chrome.storage.local.set({ picks });
}

async function loadPicks() {
  const { picks: saved } = await chrome.storage.local.get({ picks: null });
  if (saved) Object.assign(picks, saved);
  if (picks.date !== today()) Object.assign(picks, { date: today(), done: [] });
}

function openSearch(item) {
  state.current = { ...item, at: Date.now() };
  if (!picks.done.includes(searchKey(item.portal, item.term))) picks.done.push(searchKey(item.portal, item.term));
  savePicks();
  renderPlan();
  activeTab().then(tab => (tab && /^https?:/.test(tab.url || '') ? chrome.tabs.update(tab.id, { url: item.url }) : chrome.tabs.create({ url: item.url })));
}

function renderPlan() {
  const { portals, terms } = state.plan;
  // first time: leave out portals Claude can fetch without a browser; the user can tick them
  if (!picks.initialized && portals.length) {
    picks.portalsOff = portals.filter(p => p.access === 'fetch' || p.access === 'api').map(p => p.name);
    picks.initialized = true;
    savePicks();
  }
  const q = queue();
  const done = q.filter(i => picks.done.includes(searchKey(i.portal, i.term))).length;
  const next = q.find(i => !picks.done.includes(searchKey(i.portal, i.term)));
  $('plan-summary').textContent = !state.ready
    ? 'Connect your workspace to see your portals and search terms.'
    : !portals.length
      ? 'No portals with a search URL in config (portals: url_template with {q}).'
      : `${q.length} searches today (${portals.length - picks.portalsOff.length} portals × ${terms.length - picks.termsOff.length} terms), ${done} done${next ? ` · next: ${next.portal}, "${next.term}"` : ''}${q.length > 40 ? ' · untick terms or portals below to cut this down' : ''}`;
  const btn = $('next-search');
  btn.disabled = !next;
  btn.textContent = next ? `Next search (${done + 1} of ${q.length})` : q.length ? 'All searches done today' : 'Next search';
  $('reset-searches').disabled = !done;

  const toggle = (listName, value) => e => {
    const arr = picks[listName];
    if (e.target.checked) picks[listName] = arr.filter(v => v !== value);
    else if (!arr.includes(value)) arr.push(value);
    savePicks();
    renderPlan();
  };
  $('plan').replaceChildren(
    el('h3', {}, 'Terms'),
    el('div', { class: 'chips small' }, terms.map(t => el('label', {},
      el('input', { type: 'checkbox', ...(picks.termsOff.includes(t.term) ? {} : { checked: '' }) }),
      t.term,
    ))),
    ...portals.map(p => el('div', {},
      el('h3', {}, el('label', {}, el('input', { type: 'checkbox', ...(picks.portalsOff.includes(p.name) ? {} : { checked: '' }) }), `${p.name}`), el('span', { class: 'muted' }, ` ${p.access || ''}`)),
      picks.portalsOff.includes(p.name) ? null : el('div', { class: 'chips small' }, terms.filter(t => !picks.termsOff.includes(t.term)).map(t => {
        const item = { portal: p.name, term: t.term, url: searchUrl(p.template, t.term, t.location) };
        return el('a', { href: item.url, class: picks.done.includes(searchKey(p.name, t.term)) ? 'done' : '', onclick: e => { e.preventDefault(); openSearch(item); } }, t.term);
      })),
    )),
  );
  // wire the checkboxes (el() only wires onclick)
  const termBoxes = $('plan').querySelectorAll('.chips > label > input');
  terms.forEach((t, i) => termBoxes[i]?.addEventListener('change', toggle('termsOff', t.term)));
  $('plan').querySelectorAll('h3 > label > input').forEach((box, i) => box.addEventListener('change', toggle('portalsOff', portals[i].name)));
}

$('next-search').addEventListener('click', () => {
  const next = queue().find(i => !picks.done.includes(searchKey(i.portal, i.term)));
  if (next) openSearch(next);
});
$('reset-searches').addEventListener('click', () => { picks.done = []; savePicks(); renderPlan(); });

function renderWorkspace() {
  const name = $('workspace-name');
  const btn = $('connect');
  if (!state.root) {
    name.textContent = 'No workspace';
    btn.textContent = 'Connect workspace';
  } else if (!state.ready) {
    name.textContent = `${state.root.name} (access needed)`;
    btn.textContent = 'Allow access';
  } else {
    name.textContent = `${state.root.name} · ${Object.keys(state.profiles).length} portal profiles · ${state.search.terms.length} terms`;
    btn.textContent = 'Change';
  }
}

$('connect').addEventListener('click', async () => {
  try {
    if (state.root && !state.ready) await loadWorkspace(true);
    else {
      state.root = await connectWorkspace();
      await loadWorkspace(true);
    }
    log(`Workspace: ${state.root.name}`, 'good');
    analyze();
  } catch (e) {
    if (e.name !== 'AbortError') log(e.message, 'bad');
  }
});

function needWorkspace() {
  if (state.ready) return false;
  log('Connect your workspace folder first.', 'warn');
  return true;
}

// ---------- page ----------

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

const originOf = url => `${new URL(url).origin}/*`;

async function run(tabId, func, args = []) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func, args });
  return res?.result;
}

async function analyze(tabArg) {
  const tab = tabArg || (await activeTab());
  state.tab = tab;
  const body = $('page-body');
  $('page-url').textContent = tab?.url || '';
  if (!tab?.url || !/^https?:/.test(tab.url)) {
    body.replaceChildren(el('p', { class: 'muted' }, 'Open a job ad or a search results page.'));
    return;
  }
  const origin = originOf(tab.url);
  if (!(await chrome.permissions.contains({ origins: [origin] }))) {
    body.replaceChildren(
      el('p', {}, `Allow reading ${new URL(tab.url).host}? The extension reads pages on this site only when you use it here.`),
      el('button', { class: 'primary', onclick: async () => { if (await chrome.permissions.request({ origins: [origin] })) analyze(); } }, 'Allow on this site'),
    );
    return;
  }
  try {
    const ld = await run(tab.id, readJobPosting);
    if (ld?.postings?.length) return renderAd(tab, ld);
    const host = new URL(tab.url).host;
    const profile = profileFor(state.profiles, tab.url);
    if (profile) {
      const result = await run(tab.id, extractList, [profile]);
      const health = profileHealth(result);
      if (health.ok) return renderList(tab, profile, result);
      log(`${host}: saved profile failed (${health.reason}); trying a new guess`, 'warn');
    }
    const probe = await run(tab.id, probeList);
    const guess = guessProfile(probe);
    if (!guess) {
      body.replaceChildren(el('p', { class: 'muted' }, 'No job ad data and no repeated result list found on this page.'));
      return;
    }
    const result = await run(tab.id, extractList, [guess]);
    renderList(tab, guess, result, probe);
  } catch (e) {
    body.replaceChildren(el('p', { class: 'bad' }, `Could not read this page: ${e.message}`));
  }
}

function signalText(s) {
  if (!s) return '';
  const langs = (s.languages || []).map(l => `${l.lang.toUpperCase()} ${l.level.toUpperCase()}${l.required ? '' : ' (plus)'}`);
  return [s.adLanguage && `written in ${s.adLanguage.toUpperCase()}`, langs.length && `asks ${langs.join(', ')}`, s.minYears && `${s.minYears}+ years`].filter(Boolean).join(' · ');
}

function renderAd(tab, ld) {
  const postings = ld.postings.map(raw => fromJobPosting(raw, ld.canonical || tab.url, today()));
  state.view = { kind: 'ad', postings };
  $('page-body').replaceChildren(
    ...postings.map(p => el('div', {},
      el('p', {}, el('strong', {}, p.title), el('br'), `${p.company} · ${p.location || 'location not stated'}`),
      el('p', { class: 'small muted' }, [signalText(p.signals), p.salary, p.validThrough && `closes ${p.validThrough.slice(0, 10)}`].filter(Boolean).join(' · ')),
    )),
    el('button', { class: 'primary', onclick: saveAd }, postings.length > 1 ? `Save ${postings.length} ads` : 'Save ad'),
  );
}

async function saveAd() {
  if (needWorkspace()) return;
  const r = await savePostings(state.root, today(), state.view.postings, { url: state.tab.url, kind: 'ad' });
  log(`Saved ad to ${r.path} (${r.added} new, ${r.upgraded} upgraded)`, 'good');
}

function renderList(tab, profile, result, probe) {
  const host = new URL(tab.url).host;
  const listings = result.cards.filter(c => c.title && c.url).map(c => fromCard(c, host, today()));
  const relevant = listings.filter(l => worthReading(state.search, l.title));
  state.view = { kind: 'list', profile, probe, listings, relevant };
  const health = profileHealth(result);
  const learned = profile.by === 'claude' ? 'mapped by Claude' : profile.by === 'user' ? 'checked by you' : 'guessed';
  $('page-body').replaceChildren(...[
    el('p', {}, `${listings.length} listings · profile ${learned}${state.profiles[host] ? '' : ' (not saved yet)'}`),
    health.ok ? null : el('p', { class: 'warn' }, health.reason),
    el('p', { class: 'small muted' }, `${relevant.length} match your search terms`),
    el('ul', { class: 'cards' }, listings.slice(0, 8).map(l => el('li', {},
      el('div', {}, l.title),
      el('div', { class: 'meta' }, [l.company, l.location, l.postedText].filter(Boolean).join(' · ')),
    ))),
    el('div', { class: 'row' },
      el('button', { class: 'primary', onclick: () => saveList(false) }, 'Save listings'),
      el('button', { onclick: () => saveList(true) }, `Save and read ${Math.min(relevant.length, settings.cap)} ads`),
    ),
    el('div', { class: 'row small' },
      state.profiles[host] ? null : el('button', { onclick: saveProfile }, 'Keep this profile'),
      el('button', { onclick: askClaude }, 'Ask Claude to map this page'),
    ),
  ].filter(Boolean));
}

async function saveProfile() {
  if (needWorkspace()) return;
  const p = { ...state.view.profile, by: state.view.profile.by === 'heuristic' ? 'user' : state.view.profile.by };
  await writeJson(state.root, `_profile/portals/${p.host}.json`, p);
  state.profiles[p.host] = p;
  log(`Saved profile _profile/portals/${p.host}.json`, 'good');
  renderWorkspace();
}

async function askClaude() {
  if (needWorkspace()) return;
  const host = new URL(state.tab.url).host;
  const probe = state.view.probe || (await run(state.tab.id, probeList));
  await writeJson(state.root, `_profile/portals/_pending/${host}.json`, {
    url: state.tab.url,
    capturedAt: new Date().toISOString(),
    probe,
    guess: state.view.profile,
  });
  log(`Captured the page structure in _profile/portals/_pending/${host}.json. In Claude, say "map the pending portal" and reload this page afterwards.`, 'good');
}

async function saveList(readAds) {
  if (needWorkspace()) return;
  const { listings, relevant } = state.view;
  let toRead = readAds ? relevant.slice(0, settings.cap) : [];
  const skippedLinkedIn = toRead.filter(l => /(^|\.)linkedin\.com$/.test(new URL(l.url).host) && !settings.linkedin);
  toRead = toRead.filter(l => !skippedLinkedIn.includes(l));
  // the permission request must come first, while the click still counts as a user gesture
  const origins = [...new Set(toRead.map(l => originOf(l.url)))];
  if (origins.length && !(await chrome.permissions.request({ origins }))) {
    log('Reading ads needs access to the ad pages; saved listings only.', 'warn');
    toRead = [];
  }
  const cur = state.current;
  const fromSearch = cur && new URL(cur.url).host === new URL(state.tab.url).host ? cur : null;
  if (fromSearch) for (const l of listings) Object.assign(l, { query: fromSearch.term, portalName: fromSearch.portal });
  const r = await savePostings(state.root, today(), listings, { url: state.tab.url, kind: 'list', profile: state.view.profile.by, ...(fromSearch ? { portal: fromSearch.portal, query: fromSearch.term } : {}) });
  log(`Saved ${listings.length} listings to ${r.path} (${r.added} new)`, 'good');
  if (skippedLinkedIn.length) log(`${skippedLinkedIn.length} LinkedIn ads not read in the background (setting off).`, 'warn');
  if (toRead.length) readAdsInBackground(toRead);
}

async function readAdsInBackground(listings) {
  const full = [];
  const failed = [];
  for (const [i, l] of listings.entries()) {
    try {
      const res = await fetch(l.url, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const ld = readJobPosting(doc);
      if (!ld.postings.length) throw new Error('no JobPosting data');
      full.push({ ...fromJobPosting(ld.postings[0], l.url, today(), l.id), ...(l.query ? { query: l.query, portalName: l.portalName } : {}) });
    } catch (e) {
      failed.push({ ...l, needsBrowser: true, note: `not read in background: ${e.message}` });
    }
    log(`Read ${i + 1} of ${listings.length}`);
    await sleep(1500 + Math.random() * 1000);
  }
  const r = await savePostings(state.root, today(), [...full, ...failed], { url: state.tab?.url, kind: 'read-ads' });
  log(`Read ${full.length} ads in full, ${failed.length} need a browser read (${r.upgraded} listings upgraded)`, full.length ? 'good' : 'warn');
}

// ---------- settings and events ----------

async function loadSettings() {
  const s = await chrome.storage.local.get({ linkedin: false, cap: 30 });
  Object.assign(settings, s);
  $('opt-linkedin').checked = settings.linkedin;
  $('opt-cap').value = settings.cap;
}
$('opt-linkedin').addEventListener('change', e => { settings.linkedin = e.target.checked; chrome.storage.local.set({ linkedin: settings.linkedin }); });
$('opt-cap').addEventListener('change', e => { settings.cap = Math.max(1, Math.min(60, Number(e.target.value) || 30)); chrome.storage.local.set({ cap: settings.cap }); });

chrome.tabs.onActivated.addListener(() => analyze());
chrome.tabs.onUpdated.addListener((id, info, tab) => { if (tab.active && info.status === 'complete') analyze(); });

await loadSettings();
await loadPicks();
await loadWorkspace(false);
analyze();

// for tests: point the panel at a folder handle and a tab without the pickers
globalThis.__applicationHelper = {
  state,
  analyze,
  useRoot: async root => { state.root = root; await loadWorkspace(false); },
};
