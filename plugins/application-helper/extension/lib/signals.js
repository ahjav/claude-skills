// Cheap signals read from an ad's text before any model sees it: the language the ad is
// written in, the language levels it requires, and the minimum years of experience.
// The same logic lives in scripts/fetch-feeds.mjs (adSignals); a test keeps them equal.

const LEVEL_ORDER = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'];

const LANGS = {
  de: /\b(deutsch|deutschkenntnisse|deutschkenntnissen|german)\b/,
  en: /\b(englisch|englischkenntnisse|englischkenntnissen|english)\b/,
};

const LEVEL_WORDS = [
  [/\b(native|muttersprach\w*|mother tongue)\b/, 'native'],
  [/\b(fluent|fluently|fliessend\w*|fließend\w*|verhandlungssicher\w*|business fluent|proficient|excellent|sehr gut\w*|exzellent\w*|hervorragend\w*|perfekt\w*)\b/, 'c1'],
  [/\b(good|gut\w*|solid\w*|strong|fundiert\w*)\b/, 'b2'],
  [/\b(basic|grundkenntnisse\w*|basis\w*|elementary)\b/, 'a2'],
];

const OPTIONAL = /\b(plus|bonus|nice to have|nice-to-have|von vorteil|wunschenswert|wünschenswert|advantage|advantageous|preferred|helpful|ideally|idealerweise|optional|is a benefit)\b/;

const REQUIRED = /\b(required|erforderlich|vorausgesetzt|voraussetzung|must|zwingend|notwendig)\b/;

const DE_WORDS = new Set(['und', 'der', 'die', 'das', 'mit', 'fur', 'für', 'wir', 'ist', 'eine', 'ein', 'zu', 'von', 'auf', 'bei', 'dich', 'deine', 'ihre', 'sie', 'du', 'unsere', 'oder', 'nicht', 'auch']);
const EN_WORDS = new Set(['and', 'the', 'with', 'for', 'we', 'is', 'to', 'of', 'on', 'at', 'your', 'our', 'you', 'are', 'will', 'or', 'not', 'also', 'in', 'an']);

export function adSignals(text = '') {
  const lower = String(text).toLowerCase();
  const tokens = lower.split(/[^a-zäöüß]+/).filter(Boolean);
  let de = 0;
  let en = 0;
  for (const t of tokens) {
    if (DE_WORDS.has(t)) de++;
    if (EN_WORDS.has(t)) en++;
  }
  const adLanguage = de >= 8 && de > en * 1.2 ? 'de' : en >= 8 && en > de * 1.2 ? 'en' : undefined;

  const sentences = lower.split(/[\n.;•·]+|(?<=[!?])\s/).map(s => s.trim()).filter(Boolean);

  const languages = [];
  for (const [lang, re] of Object.entries(LANGS)) {
    let best;
    for (const s of sentences) {
      if (!re.test(s)) continue;
      // "Sehr gute Deutschkenntnisse (C1) und gute Englischkenntnisse": read each language's
      // level from its own clause
      const clause = s.split(/\s+(?:und|and|sowie|as well as|plus)\s+|,|\/|\s+–\s+/).find(c => re.test(c)) || s;
      const levelOf = t => {
        const explicit = t.match(/\b(a1|a2|b1|b2|c1|c2)\b/);
        if (explicit) return explicit[1];
        for (const [w, l] of LEVEL_WORDS) if (w.test(t)) return l;
        return undefined;
      };
      const mentions = Object.values(LANGS).filter(r => r.test(s)).length;
      let level = levelOf(clause) || (mentions === 1 ? levelOf(s) : undefined);
      const optional = OPTIONAL.test(s);
      if (!level && !optional && !REQUIRED.test(s)) continue;
      level ||= 'unspecified';
      const cand = { lang, level, required: !optional, evidence: s.slice(0, 140) };
      if (!best || rank(cand) > rank(best)) best = cand;
    }
    if (best) languages.push(best);
  }

  let minYears;
  const yearRe = /(\d{1,2})\s*\+?\s*(?:(?:-|–|to|bis)\s*\d{1,2}\s*)?(?:years?|yrs|jahre?n?)\b/g;
  for (const s of sentences) {
    if (!/(experience|erfahrung|berufserfahrung)/.test(s)) continue;
    for (const m of s.matchAll(yearRe)) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 15 && (minYears === undefined || n < minYears)) minYears = n;
    }
  }

  return { adLanguage, languages, minYears };
}

function rank(c) {
  return (c.required ? 10 : 0) + LEVEL_ORDER.indexOf(c.level);
}

export function levelAbove(level, limit) {
  return LEVEL_ORDER.indexOf(level) > LEVEL_ORDER.indexOf(limit);
}
