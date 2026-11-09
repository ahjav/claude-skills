// List profiles: how to read the result cards of one portal's search page.
// Stored in the workspace as _profile/portals/<host>.json. Claude writes or corrects them
// (job-search, references/page-extraction.md); guessProfile gives a first version so a new
// portal works before Claude has looked at it.
import { daysAgo } from './posting.js';

const PLACE = /\b(remote|hybrid|homeoffice|home office|berlin|hamburg|m[uü]nchen|munich|k[oö]ln|cologne|frankfurt|stuttgart|d[uü]sseldorf|leipzig|dresden|hannover|n[uü]rnberg|bremen|essen|dortmund|deutschland|germany|europe|eu)\b|,\s*[A-Z]/i;

export function guessProfile(probe) {
  const cand = probe.candidates?.[0];
  if (!cand) return null;
  const parts = cand.samples[0] || [];
  const fields = {};
  const used = new Set();

  const isHeading = p => /(^|> )h[1-4]\b/.test(p.sel);
  const linkPart = parts.find(p => p.href && p.text && p.text.length >= 6);
  const headingPart = parts.find(p => isHeading(p) && p.text && p.text.length >= 6 && (!linkPart || p.text === linkPart.text || !linkPart.text.includes(p.text)));
  // the title is the heading when there is one (a link's text can be a hidden copy), the
  // main link otherwise; the link is the link carrying the title, else the card's first link
  const titlePart = headingPart || linkPart;
  if (titlePart) {
    fields.title = titlePart.sel;
    const titleLink = parts.find(p => p.href && p.text === titlePart.text) || linkPart;
    fields.link = titleLink ? `${titleLink.sel}@href` : 'a@href';
    used.add(titlePart);
    if (titleLink) used.add(titleLink);
    for (const p of parts) if (p.text === titlePart.text) used.add(p);
  }
  const datePart = parts.find(p => p.datetime) || parts.find(p => !used.has(p) && daysAgo(p.text) !== undefined);
  if (datePart) {
    fields.date = datePart.datetime ? `${datePart.sel}@datetime || ${datePart.sel}` : datePart.sel;
    used.add(datePart);
  }
  // company names are often links to the company page, so links stay in
  const rest = parts.filter(p => !used.has(p) && p.text && p.text.length >= 2 && p.text.length <= 80);
  const loc = rest.find(p => PLACE.test(p.text));
  if (loc) {
    fields.location = loc.sel;
    used.add(loc);
  }
  const company = rest.find(p => !used.has(p));
  if (company) fields.company = company.sel;

  return {
    host: probe.host,
    match: [`https://${probe.host}/`],
    card: cand.card,
    fields,
    by: 'heuristic',
    learnedAt: new Date().toISOString(),
  };
}

export function profileFor(profiles, url) {
  let host;
  try { host = new URL(url).host; } catch { return null; }
  const list = Object.values(profiles || {});
  return list.find(p => (p.match || []).some(m => url.startsWith(m))) || list.find(p => p.host === host) || null;
}

// A profile needs Claude's attention when it found nothing, or titles or links are missing on
// more than a third of the cards.
export function profileHealth(result) {
  if (!result.count) return { ok: false, reason: 'no cards found' };
  for (const k of ['title', 'url']) {
    if (result.empty[k] > result.count / 3) return { ok: false, reason: `${k} empty on ${result.empty[k]} of ${result.count} cards` };
  }
  return { ok: true };
}
