// Records copied from the live feeds on 2026-11-06 (long strings cut), so the adapters are
// checked against the real field names and escaping, not only hand-made fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { adapters, locationOk } from '../fetch-feeds.mjs';

const greenhouse = {
  jobs: [{
    absolute_url: 'https://job-boards.greenhouse.io/gitlab/jobs/8638232002',
    data_compliance: [{ type: 'gdpr', requires_consent: false }],
    internal_job_id: 6449994002,
    location: { name: 'Remote, United States' },
    metadata: [{ id: 4595831002, name: 'Quota Coverage Type', value: 'n/a', value_type: 'single_select' }],
    id: 8638232002,
    updated_at: '2026-10-28T12:23:39-04:00',
    requisition_id: '6682',
    title: 'AI Transformation Owner, CRO',
    company_name: 'GitLab',
    first_published: '2026-07-22T13:38:40-04:00',
    language: 'en',
    application_deadline: null,
    content: '&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;GitLab is the intelligent orchestration platform for DevSecOps. GitLab enables organizations to increase developer productivity, improve operational efficiency, reduce security and compliance risk, and accelerate digit',
    departments: [{ id: 4114891002, name: 'Enablement', child_ids: [], parent_id: 4011049002 }],
    offices: [],
  }],
};

const lever = [{
  additionalPlain: 'Palantir is particularly interested in applicants who have a current right to work in Singapore, and we encourage Singapore c',
  additional: '<div>Palantir is particularly interested in applicants who have a current right to work in Singapore, and we encourage Singa',
  categories: { commitment: 'Full-time', location: 'Singapore, Singapore', team: 'Administrative', allLocations: ['Singapore, Singapore'] },
  createdAt: 1786469891368,
  descriptionPlain: 'A World-Changing Company\n \nPalantir builds the world’s leading software for data-driven decisions and operations. By bringing th',
  description: '<div><strong><span style="font-size: 18px;">A World-Changing Company</span></strong></div>\n<div>&nbsp;</div>\n<div>Palantir ',
  id: '6ed76ce8-4156-4b60-b120-403538bd66cd',
  lists: [
    { text: 'What We Require', content: '\n<li>At least three years of previous administrative or personal support experience, preferably in a fast-paced environmen' },
  ],
  text: 'Administrative Business Partner',
  country: 'SG',
  workplaceType: 'hybrid',
  hostedUrl: 'https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd',
  applyUrl: 'https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd/apply',
}];

const ashby = {
  jobs: [{
    id: '7458d4e9-da2e-47bd-98cb-adfda43d42b2',
    title: 'Engineering Manager - EU',
    department: 'Engineering',
    team: 'EMEA Engineering',
    employmentType: 'FullTime',
    location: 'Remote - European Union',
    shouldDisplayCompensationOnJobPostings: true,
    secondaryLocations: [
      { location: 'Spain', address: { postalAddress: { addressCountry: 'Spain' } } },
      { location: 'Germany', address: { postalAddress: { addressCountry: 'Germany', addressLocality: '' } } },
      { location: 'Berlin', address: { postalAddress: { addressCountry: 'Germany', addressLocality: 'Berlin' } } },
    ],
    publishedAt: '2024-03-04T14:29:08.532+00:00',
    isListed: true,
    isRemote: true,
    workplaceType: 'Remote',
    jobUrl: 'https://jobs.ashbyhq.com/ashby/7458d4e9-da2e-47bd-98cb-adfda43d42b2',
    applyUrl: 'https://jobs.ashbyhq.com/ashby/7458d4e9-da2e-47bd-98cb-adfda43d42b2/application',
    descriptionHtml: '<p style="min-height:1.5em">Hi 👋 I’m <a target="_blank" href="https://uk.linkedin.com">Colin</a>',
    descriptionPlain: 'Hi 👋 I’m Colin https://uk.linkedin.com/in/colinhoweuk, Director of Engineering, Europe. How do you feel about software...',
    compensation: { compensationTierSummary: '€150K – €250K • Offers Equity • Offers Bonus', scrapeableCompensationSalarySummary: '€150K - €250K' },
  }],
};

function withFetch(body, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status: 200 });
  return fn().finally(() => { globalThis.fetch = original; });
}

test('greenhouse live record', () => withFetch(greenhouse, async () => {
  const [p] = await adapters.greenhouse({ slug: 'gitlab' });
  assert.equal(p.jobId, '8638232002');
  assert.equal(p.title, 'AI Transformation Owner, CRO');
  assert.equal(p.location, 'Remote, United States');
  assert.equal(p.workMode, 'remote');
  assert.equal(p.postedAt, '2026-07-22T17:38:40.000Z');
  assert.equal(p.applyUrl, 'https://job-boards.greenhouse.io/gitlab/jobs/8638232002');
  assert.match(p.description, /^GitLab is the intelligent orchestration platform/);
  assert.doesNotMatch(p.description, /[<>]|&quot;|&lt;/);
  assert.equal(locationOk(['Germany', 'Berlin', 'Remote'], p), false, 'US-only remote must not pass a Germany filter');
}));

test('lever live record', () => withFetch(lever, async () => {
  const [p] = await adapters.lever({ slug: 'palantir' });
  assert.equal(p.title, 'Administrative Business Partner');
  assert.equal(p.location, 'Singapore, Singapore');
  assert.equal(p.workMode, 'hybrid');
  assert.equal(p.postedAt, new Date(1786469891368).toISOString());
  assert.match(p.description, /A World-Changing Company/);
  assert.match(p.description, /What We Require\n- At least three years/);
  assert.match(p.description, /right to work in Singapore/);
  assert.equal(p.applyUrl, 'https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd/apply');
}));

test('ashby live record', () => withFetch(ashby, async () => {
  const [p] = await adapters.ashby({ slug: 'ashby' });
  assert.equal(p.title, 'Engineering Manager - EU');
  assert.equal(p.location, 'Remote - European Union; Spain; Germany; Berlin');
  assert.equal(p.workMode, 'remote');
  assert.equal(p.salary, '€150K – €250K • Offers Equity • Offers Bonus');
  assert.match(p.description, /Director of Engineering, Europe/);
  assert.equal(locationOk(['Germany', 'Berlin', 'Remote'], p), true);
}));
