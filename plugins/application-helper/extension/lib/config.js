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
