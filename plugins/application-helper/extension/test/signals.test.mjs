import test from 'node:test';
import assert from 'node:assert/strict';
import { adSignals } from '../lib/signals.js';
import { adSignals as feedSignals } from '../../scripts/fetch-feeds.mjs';
import { worthReading, searchConfig } from '../lib/config.js';
import { daysAgo, cleanUrl } from '../lib/posting.js';

const samples = {
  germanStrict: 'Wir suchen dich für unser Team. Du bringst mindestens 3 Jahre Berufserfahrung mit Kotlin mit. Sehr gute Deutschkenntnisse (C1) und gute Englischkenntnisse. Wir bieten dir ein tolles Team und die Möglichkeit, mit uns zu wachsen, auf der Basis von Vertrauen.',
  englishPlus: 'We are looking for a backend engineer. You have 5+ years of experience with Java and Spring. German is a plus but not required. You will work with our team on the platform and you are fluent in English. We offer a great team and the chance to grow with us.',
  fluentGerman: 'You speak fluent German and English. 2-4 years of professional experience in backend development.',
  b1: 'Deutsch auf B1-Niveau ist ausreichend.',
  none: 'Kotlin, Spring Boot, PostgreSQL.',
};

test('signals', () => {
  const g = adSignals(samples.germanStrict);
  assert.equal(g.adLanguage, 'de');
  assert.equal(g.minYears, 3);
  assert.deepEqual(g.languages.map(l => [l.lang, l.level, l.required]), [['de', 'c1', true], ['en', 'b2', true]]);

  const e = adSignals(samples.englishPlus);
  assert.equal(e.adLanguage, 'en');
  assert.equal(e.minYears, 5);
  const de = e.languages.find(l => l.lang === 'de');
  assert.deepEqual([de.level, de.required], ['unspecified', false]);

  const f = adSignals(samples.fluentGerman);
  const fd = f.languages.find(l => l.lang === 'de');
  assert.deepEqual([fd.level, fd.required], ['c1', true]);
  assert.equal(f.minYears, 2);

  assert.equal(adSignals(samples.b1).languages[0].level, 'b1');
  assert.deepEqual(adSignals(samples.none), { adLanguage: undefined, languages: [], minYears: undefined });
});

test('feed script and extension compute the same signals', () => {
  for (const [name, text] of Object.entries(samples)) assert.deepEqual(feedSignals(text), adSignals(text), name);
});

test('listing relevance uses distinctive words', () => {
  const cfg = searchConfig('saved_searches:\n  backend engineer | Germany | any\n  java developer | Germany | any\n  softwareentwickler | Germany | any   # local: de\n  developer | Berlin | any\nexclude_terms: working student\n');
  assert.deepEqual(cfg.terms, ['backend engineer', 'java developer', 'softwareentwickler', 'developer']);
  const narrow = { ...cfg, terms: cfg.terms.slice(0, 3) };
  assert.equal(worthReading(narrow, 'Backend-Entwickler:in (m/w/d)'), true);
  assert.equal(worthReading(narrow, 'Senior Java Developer'), true);
  assert.equal(worthReading(narrow, 'Softwareentwickler Java (m/w/d)'), true);
  assert.equal(worthReading(narrow, 'QA Engineer'), false);
  assert.equal(worthReading(narrow, 'Working Student Backend'), false);
  assert.equal(worthReading(cfg, 'Frontend Developer'), true, 'a generic-only term ("developer") needs all its words');
});

test('relative dates and url cleaning', () => {
  const now = new Date('2026-11-09T12:00:00Z');
  assert.equal(daysAgo('vor 2 Tagen', now), 2);
  assert.equal(daysAgo('Heute', now), 0);
  assert.equal(daysAgo('gestern', now), 1);
  assert.equal(daysAgo('1 week ago', now), 7);
  assert.equal(daysAgo('30+ days ago', now), 30);
  assert.equal(daysAgo('2026-11-07', now), 2);
  assert.equal(daysAgo('07.11.2026', now), 2);
  assert.equal(daysAgo('Berlin', now), undefined);
  assert.equal(cleanUrl('https://de.linkedin.com/jobs/view/123?refId=a&trackingId=b&position=3&pageNum=0'), 'https://de.linkedin.com/jobs/view/123');
  assert.equal(cleanUrl('https://x.de/job?id=5&utm_source=g#top'), 'https://x.de/job?id=5');
});
