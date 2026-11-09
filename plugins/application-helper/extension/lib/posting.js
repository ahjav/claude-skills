// Turns what the page readers return into the posting format the feed script writes, so
// job-search and job-intake read browser and feed results the same way.
import { adSignals } from './signals.js';

const DESCRIPTION_MAX = 12000;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', ndash: '-', mdash: '-', hellip: '...', bull: '-', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', eacute: 'é' };

export function decodeEntities(s = '') {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function htmlToText(html = '') {
  let s = String(html);
  if (/&lt;\w/.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<\/\s*(p|div|li|ul|ol|h[1-6]|tr)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(s).split('\n').map(l => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).join('\n').trim();
}

// Tracking parameters differ per visit; drop them so the same ad gets the same id.
export function cleanUrl(u) {
  try {
    const url = new URL(u);
    for (const k of [...url.searchParams.keys()]) {
      if (/^(utm_|trk|ref|refid|tracking|src$|source$|fbclid|gclid|cmp|campaign|position|pagenum|currentjobid$)/i.test(k)) url.searchParams.delete(k);
    }
    url.hash = '';
    return url.href;
  } catch {
    return u;
  }
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

// Ids come from the cleaned URL, so a listing and the full ad read from its link share one id.
export function postingId(host, url) {
  return `browser/${host}/${hash(cleanUrl(url))}`;
}

function asArray(v) {
  return v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];
}

function placeText(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  const a = loc.address || loc;
  if (typeof a === 'string') return a;
  return [a.addressLocality, a.addressRegion, typeof a.addressCountry === 'object' ? a.addressCountry?.name : a.addressCountry].filter(Boolean).join(', ');
}

function salaryText(s) {
  if (!s) return undefined;
  if (typeof s === 'string') return s;
  const v = s.value || {};
  const unit = (v.unitText || '').toLowerCase();
  const n = x => (typeof x === 'number' ? x.toLocaleString('en') : x);
  const range = v.minValue !== undefined || v.maxValue !== undefined ? `${n(v.minValue ?? '')}-${n(v.maxValue ?? '')}` : v.value !== undefined ? `${n(v.value)}` : '';
  return range ? `${range} ${s.currency || ''} ${unit}`.replace(/\s+/g, ' ').trim() : undefined;
}

function isoDate(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// raw: one JobPosting object from readJobPosting; pageUrl: where it was read.
export function fromJobPosting(raw, pageUrl, today, listingId) {
  const url = cleanUrl(raw.url || pageUrl);
  const host = new URL(url).host;
  const locations = asArray(raw.jobLocation).map(placeText).filter(Boolean);
  const remote = String(raw.jobLocationType || '').toUpperCase().includes('TELECOMMUTE');
  const applicantArea = asArray(raw.applicantLocationRequirements).map(r => r.name || placeText(r)).filter(Boolean);
  const description = htmlToText(raw.description || '');
  const jobId = typeof raw.identifier === 'object' ? raw.identifier?.value : raw.identifier;
  return {
    id: listingId || postingId(host, url),
    source: 'browser',
    kind: 'ad',
    portal: host,
    company: (typeof raw.hiringOrganization === 'object' ? raw.hiringOrganization?.name : raw.hiringOrganization) || '',
    jobId: jobId ? String(jobId) : undefined,
    title: htmlToText(raw.title || ''),
    location: [...locations, ...(remote ? [`Remote${applicantArea.length ? ` (${applicantArea.join(', ')})` : ''}`] : [])].join('; '),
    workMode: remote ? 'remote' : undefined,
    postedAt: isoDate(raw.datePosted),
    validThrough: isoDate(raw.validThrough),
    employmentType: asArray(raw.employmentType).join(', ') || undefined,
    url,
    applyUrl: url,
    salary: salaryText(raw.baseSalary || raw.estimatedSalary),
    firstSeen: today,
    signals: adSignals(description),
    description: description.length > DESCRIPTION_MAX ? `${description.slice(0, DESCRIPTION_MAX)}\n[cut at ${DESCRIPTION_MAX} characters]` : description,
  };
}

// card: one entry from extractList. Listings carry no description; job-search decides which
// to read in full.
export function fromCard(card, host, today) {
  const url = cleanUrl(card.url);
  return {
    id: postingId(host, url),
    source: 'browser',
    portal: host,
    kind: 'listing',
    company: card.company || '',
    title: card.title || '',
    location: card.location || '',
    workMode: /remote|homeoffice|home office/i.test(`${card.location} ${card.lines?.join(' ')}`) ? 'remote' : /hybrid/i.test(`${card.location} ${card.lines?.join(' ')}`) ? 'hybrid' : undefined,
    postedText: card.posted || undefined,
    postedDaysAgo: daysAgo(card.posted),
    salary: card.salary || undefined,
    url,
    firstSeen: today,
    lines: card.lines,
  };
}

// "vor 2 Tagen", "3 days ago", "Heute", "gestern", "1 week ago", "30+ days ago", ISO dates.
export function daysAgo(text, now = new Date()) {
  if (!text) return undefined;
  const t = String(text).toLowerCase();
  const iso = t.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return Math.max(0, Math.floor((now - new Date(iso[0])) / 864e5));
  const dmy = t.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (dmy) return Math.max(0, Math.floor((now - new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`)) / 864e5));
  if (/(today|heute|just now|gerade|soeben|neu\b|new\b)/.test(t)) return 0;
  if (/(yesterday|gestern)/.test(t)) return 1;
  const m = t.match(/(\d+)\+?\s*(minute|min|hour|stunde|std|day|tag|week|woche|month|monat)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2];
  if (/^(minute|min|hour|stunde|std)/.test(unit)) return 0;
  if (/^(day|tag)/.test(unit)) return n;
  if (/^(week|woche)/.test(unit)) return n * 7;
  return n * 30;
}
