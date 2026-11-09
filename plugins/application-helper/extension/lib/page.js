// Functions that run inside a web page. chrome.scripting.executeScript serializes them, so
// each one is self-contained: no imports, no references outside its own body.

// Reads schema.org JobPosting data that job pages embed for search engines. Works on a live
// page and on a document parsed from fetched HTML (pass it as `doc`).
export function readJobPosting(doc) {
  const d = doc || document;
  const found = [];
  const isPosting = t => t === 'JobPosting' || (Array.isArray(t) && t.includes('JobPosting'));
  const walk = n => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (isPosting(n['@type'])) found.push(n);
    if (n['@graph']) walk(n['@graph']);
    if (n.mainEntity) walk(n.mainEntity);
  };
  for (const s of d.querySelectorAll('script[type="application/ld+json"]')) {
    try { walk(JSON.parse(s.textContent)); } catch (e) { /* malformed block: skip */ }
  }
  const canonical = d.querySelector('link[rel="canonical"]')?.getAttribute('href');
  return { url: d.location ? d.location.href : undefined, canonical, title: d.title, postings: found };
}

// Finds the repeated result cards on a search results page and describes their parts, so a
// list profile can be written (by the heuristic in profile.js, or by Claude).
export function probeList() {
  const STABLE_ATTRS = ['data-testid', 'data-test', 'data-at', 'data-qa', 'data-cy', 'data-automation', 'itemtype', 'role'];
  const esc = v => (window.CSS && CSS.escape ? CSS.escape(v) : v.replace(/["\\]/g, '\\$&'));
  const stableClass = c => /^[a-zA-Z][\w-]{1,40}$/.test(c) && !(/\d/.test(c) && /[a-z]\d|\d[a-z]/i.test(c) && c.length >= 6) && !/^(css|sc|jsx|emotion|svelte)-/.test(c);
  const sig = el => {
    const tag = el.tagName.toLowerCase();
    for (const a of STABLE_ATTRS) {
      const v = el.getAttribute(a);
      if (v && v.length < 60) return `${tag}[${a}="${esc(v)}"]`;
    }
    const classes = [...el.classList].filter(stableClass).slice(0, 2);
    return classes.length ? `${tag}.${classes.map(esc).join('.')}` : tag;
  };
  const text = el => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

  const groups = new Map();
  for (const el of document.body.querySelectorAll('*')) {
    if (!el.querySelector('a[href]') && !(el.tagName === 'A' && el.hasAttribute('href'))) continue;
    const len = text(el).length;
    if (len < 20 || len > 2000) continue;
    const s = sig(el);
    const ps = el.parentElement ? sig(el.parentElement) : '';
    if (s === 'a' || s === 'span') continue;
    if ((s === 'div' || s === 'li') && (ps === 'div' || ps === '')) continue; // too generic to select reliably
    const key = `${ps} > ${s}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el);
  }

  const scored = [];
  for (const [key, els] of groups) {
    if (els.length < 3) continue;
    const hrefs = new Set(els.map(e => (e.matches('a[href]') ? e : e.querySelector('a[href]')).href));
    if (hrefs.size < els.length * 0.8) continue;
    const avg = els.reduce((n, e) => n + text(e).length, 0) / els.length;
    if (avg < 30) continue;
    scored.push({ key, els, score: els.length * Math.min(1, avg / 120) });
  }
  scored.sort((a, b) => (b.score - a.score) || (a.els[0].contains(b.els[0]) ? -1 : 1));
  if (!scored.length) return { url: location.href, host: location.host, count: 0, candidates: [] };

  // A selector that finds el inside card: its own signature when that is unique in the card,
  // otherwise a :scope path with :nth-of-type where siblings share a signature.
  const relSel = (card, el) => {
    const own = sig(el);
    try { if (card.querySelectorAll(own).length === 1) return own; } catch (e) { /* fall through */ }
    const steps = [];
    for (let n = el; n && n !== card; n = n.parentElement) {
      const s = sig(n);
      const same = n.parentElement ? [...n.parentElement.children].filter(c => sig(c) === s) : [n];
      if (same.length > 1) {
        const i = [...n.parentElement.children].filter(c => c.tagName === n.tagName).indexOf(n) + 1;
        steps.unshift(`${s}:nth-of-type(${i})`);
      } else steps.unshift(s);
    }
    return `:scope > ${steps.join(' > ')}`;
  };

  const describe = card => {
    const parts = [];
    const seen = new Set();
    for (const el of card.querySelectorAll('*')) {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      // links often wrap their text in a span; read the whole link so it can be the title
      const t = own || (el.children.length === 0 || el.tagName === 'A' ? text(el) : '');
      const href = el.tagName === 'A' ? el.getAttribute('href') : undefined;
      const datetime = el.getAttribute('datetime') || undefined;
      if (!t && !datetime) continue;
      if (t.length > 200) continue;
      const s = relSel(card, el);
      const k = `${s}|${t}`;
      if (seen.has(k)) continue;
      seen.add(k);
      parts.push({ sel: s, text: t, ...(href ? { href } : {}), ...(datetime ? { datetime } : {}) });
      if (parts.length >= 15) break;
    }
    return parts;
  };

  const count = s => { try { return document.querySelectorAll(s).length; } catch (e) { return -1; } };
  // The parent > child signature often also matches menus or footers; narrow it with the
  // nearest ancestor that has an id or a signature unique in the page.
  const narrow = (key, els) => {
    const base = key.replace(/^ > /, '');
    if (count(base) === els.length) return base;
    for (let a = els[0].parentElement?.parentElement, i = 0; a && a !== document.body && i < 8; a = a.parentElement, i++) {
      if (!els.every(e => a.contains(e))) continue;
      const anchors = [];
      if (a.id && !/\d{4,}/.test(a.id)) anchors.push(`#${esc(a.id)}`);
      const s = sig(a);
      if (s.includes('[') || s.includes('.')) anchors.push(s);
      for (const anc of anchors) if (count(anc) === 1 && count(`${anc} ${base}`) === els.length) return `${anc} ${base}`;
    }
    return base;
  };

  const candidates = scored.slice(0, 3).map(({ key, els }) => {
    const selector = narrow(key, els);
    return { card: selector, count: els.length, samples: els.slice(0, 2).map(describe) };
  });
  return { url: location.href, host: location.host, count: candidates[0].count, candidates };
}

// Extracts every card on a results page with a list profile. Field specs: "css" reads the
// text, "css@attr" an attribute, "@attr" an attribute of the card, "a || b" tries in order.
export function extractList(profile) {
  const read = (card, spec) => {
    if (!spec) return '';
    for (const alt of String(spec).split('||').map(s => s.trim())) {
      const at = alt.lastIndexOf('@');
      const sel = at >= 0 ? alt.slice(0, at).trim() : alt;
      const attr = at >= 0 ? alt.slice(at + 1).trim() : '';
      let el = card;
      if (sel) {
        try { el = card.querySelector(sel); } catch (e) { el = null; }
      }
      if (!el) continue;
      const v = attr ? el.getAttribute(attr) : (el.innerText || el.textContent);
      const clean = (v || '').replace(/\s+/g, ' ').trim();
      if (clean) return clean;
    }
    return '';
  };
  let cards = [];
  try { cards = [...document.querySelectorAll(profile.card)].slice(0, 100); } catch (e) { cards = []; }
  const f = profile.fields || {};
  const out = cards.map(card => {
    const href = read(card, f.link) || (card.matches('a[href]') ? card.getAttribute('href') : card.querySelector('a[href]')?.getAttribute('href')) || '';
    let url = '';
    try { url = href ? new URL(href, location.href).href : ''; } catch (e) { url = ''; }
    const lines = [...new Set((card.innerText || card.textContent || '').split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s && s.length <= 120))].slice(0, 8);
    return {
      title: read(card, f.title),
      company: read(card, f.company),
      location: read(card, f.location),
      posted: read(card, f.date),
      salary: read(card, f.salary),
      url,
      lines,
    };
  });
  const empty = {};
  for (const k of ['title', 'company', 'location', 'posted', 'url']) empty[k] = out.filter(c => !c[k]).length;
  return { url: location.href, host: location.host, count: out.length, empty, cards: out };
}
