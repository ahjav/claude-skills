// Reads the search terms and excludes from _profile/config.md, to decide which listings are
// worth reading in full. Same rules as scripts/fetch-feeds.mjs.

function block(text, key) {
  const out = [];
  let inBlock = false;
  for (const raw of text.split(/\r?\n/)) {
    if (!inBlock) {
      const m = raw.match(new RegExp(`^${key}:\\s*(.*)$`));
      if (m) {
        inBlock = true;
        const inline = ` ${m[1]}`.replace(/\s+#.*$/, '').trim();
        if (inline) out.push(inline);
      }
      continue;
    }
    const t = raw.trim();
    if (!t || t.startsWith('#')) continue;
    if (/^\S/.test(raw) && !raw.startsWith('- ')) break;
    out.push(raw.replace(/\s+#.*$/, ''));
  }
  return out;
}

const list = s => s.split(',').map(x => x.trim()).filter(Boolean);

export function searchConfig(text) {
  const terms = block(text, 'saved_searches').flatMap(l => list(l.replace(/^\s*-\s+/, '').split('|')[0]));
  const exclude = block(text, 'exclude_terms').flatMap(l => list(l.replace(/^\s*-\s+/, '')));
  return { terms: [...new Set(terms)], exclude };
}

export function words(s = '') {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9+#.]+/).map(w => w.replace(/^\.+|\.+$/g, '')).filter(Boolean);
}

// Role nouns and levels that appear in almost every title, so they cannot decide a match.
const GENERIC = new Set(['engineer', 'developer', 'entwickler', 'ingenieur', 'engineering', 'senior', 'junior', 'mid', 'lead', 'staff', 'principal', 'm', 'w', 'd', 'f', 'x', 'in', 'mwd', 'fmd', 'all', 'genders']);

// Worth reading in full: the title holds every distinctive word of some term ("backend" for
// "backend engineer", "java" for "java developer"), and no exclude term. A listing only has
// its title, so this is stricter than the feed script, which also checks the description.
export function worthReading({ terms, exclude }, title) {
  const t = words(title);
  const joined = ` ${t.join(' ')} `;
  if (exclude.some(x => { const w = words(x).join(' '); return w && joined.includes(` ${w} `); })) return false;
  if (!terms.length) return true;
  const set = new Set(t);
  return terms.some(term => {
    const tw = words(term);
    const key = tw.filter(w => !GENERIC.has(w));
    return (key.length ? key : tw).every(w => set.has(w));
  });
}

// ---------- portals and searches, for the Searches section ----------

function items(lines) {
  const out = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^\s*-\s+(.*)$/);
    const body = m ? m[1] : line.trim();
    if (m) out.push((cur = {}));
    const kv = body.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv && cur) cur[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

// Portals and employer sites that have a search URL with {q}, and every saved search.
// API portals are left out: their results are JSON, which Claude reads directly.
export function searchPlan(text) {
  const portals = items(block(text, 'portals'))
    .map(p => ({ name: p.name, access: (p.access || '').split(/\s/)[0], role: p.role, template: p.url_template }))
    .filter(p => p.name && p.template && /\{q\}/.test(p.template) && p.access !== 'api');
  const sites = items(block(text, 'employer_sites'))
    .map(s => ({ name: s.name, access: (s.access || '').split(/\s/)[0], role: 'employer', template: s.search_url_template || '' }))
    .filter(s => s.name && /\{q\}/.test(s.template));
  const searches = block(text, 'saved_searches').map(l => {
    const [terms = '', location = '', mode = ''] = l.replace(/^\s*-\s+/, '').split('|').map(s => s.trim());
    return { terms: list(terms), location, mode };
  });
  const seen = new Set();
  const terms = [];
  for (const s of searches) for (const term of s.terms) {
    if (seen.has(term)) continue;
    seen.add(term);
    terms.push({ term, location: s.location, mode: s.mode });
  }
  return { portals: [...portals, ...sites], terms };
}

// {q} and {loc} in a URL path become slugs ("backend-engineer"), in a query string they are
// URL-encoded. "any" or an empty location leaves {loc} empty.
export function searchUrl(template, term, location) {
  const loc = !location || /^(any|anywhere)$/i.test(location) ? '' : location;
  const q = template.indexOf('?');
  // German letters as German sites spell them in URLs (muenchen, not munchen)
  const slug = s => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const fill = (part, inPath) => part
    .replace(/\{q\}/g, inPath ? slug(term) : encodeURIComponent(term))
    .replace(/\{loc\}/g, inPath ? slug(loc) : encodeURIComponent(loc));
  return q < 0 ? fill(template, true) : fill(template.slice(0, q), true) + fill(template.slice(q), false);
}
