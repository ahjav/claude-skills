// Fixture feeds shaped like the real responses (field names checked against live feeds for
// Greenhouse, Lever and Ashby; Personio, SmartRecruiters and Workable from their public docs).
// Each board has one backend role that should match and one or two that should not.

const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const xml = body => new Response(body, { status: 200, headers: { 'Content-Type': 'application/xml' } });
const notFound = () => new Response('not found', { status: 404 });

export function routes({ workableWidgetFails = false } = {}) {
  return {
    'GET https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true': () => json({
      jobs: [
        { id: 111, title: 'Backend Engineer, Payments', location: { name: 'Berlin, Germany' }, absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/111', updated_at: '2026-11-03T10:00:00-04:00', first_published: '2026-11-02T10:00:00-04:00', content: '&lt;p&gt;Our stack is &lt;b&gt;Kotlin&lt;/b&gt; and Spring.&lt;/p&gt;' },
        { id: 112, title: 'Product Designer', location: { name: 'Berlin' }, absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/112', content: '' },
        { id: 113, title: 'Working Student Backend', location: { name: 'Berlin' }, absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/113', content: 'kotlin' },
      ],
    }),
    'GET https://boards-api.greenhouse.io/v1/boards/broken/jobs?content=true': notFound,
    'GET https://api.eu.lever.co/v0/postings/levco?mode=json': () => json([
      { id: 'lev-1', text: 'Senior Java Engineer', categories: { location: 'Berlin', allLocations: ['Berlin'], commitment: 'Full-time' }, workplaceType: 'hybrid', createdAt: 1762300000000, hostedUrl: 'https://jobs.eu.lever.co/levco/lev-1', applyUrl: 'https://jobs.eu.lever.co/levco/lev-1/apply', descriptionPlain: 'Java services.', lists: [{ text: 'Requirements', content: '<li>Java 17</li><li>Spring Boot</li>' }], additionalPlain: '' },
      { id: 'lev-2', text: 'Java Engineer', categories: { location: 'Paris', allLocations: ['Paris'] }, workplaceType: 'onsite', createdAt: 1762300000000, hostedUrl: 'https://jobs.eu.lever.co/levco/lev-2', descriptionPlain: 'On site in Paris.' },
    ]),
    'GET https://api.ashbyhq.com/posting-api/job-board/ash?includeCompensation=true': () => json({
      jobs: [
        { id: 'ash-1', title: 'Backend Engineer', location: 'Remote (EU)', secondaryLocations: [], isRemote: true, workplaceType: 'Remote', isListed: true, publishedAt: '2026-11-04T08:00:00.000+00:00', jobUrl: 'https://jobs.ashbyhq.com/ash/ash-1', applyUrl: 'https://jobs.ashbyhq.com/ash/ash-1/application', descriptionPlain: 'Kotlin, Postgres.', compensation: { compensationTierSummary: '€60K – €75K' } },
        { id: 'ash-2', title: 'Backend Engineer', location: 'Berlin', isListed: false, jobUrl: 'x', descriptionPlain: 'unlisted' },
      ],
    }),
    'GET https://pers.jobs.personio.de/xml?language=en': () => xml(`<?xml version="1.0" encoding="UTF-8"?>
<workzag-jobs>
  <position><id>501</id><subcompany>Pers GmbH</subcompany><office>Berlin</office><department>Tech</department><name>Backend Engineer Kotlin</name>
    <jobDescriptions><jobDescription><name>Your mission</name><value><![CDATA[<p>Build our Kotlin services.</p>]]></value></jobDescription></jobDescriptions>
    <employmentType>permanent</employmentType><seniority>experienced</seniority><schedule>full-time</schedule><createdAt>2026-11-01T09:00:00+00:00</createdAt></position>
  <position><id>502</id><office>Berlin</office><name>Office Manager</name><jobDescriptions></jobDescriptions><createdAt>2026-11-01T09:00:00+00:00</createdAt></position>
</workzag-jobs>`),
    'GET https://api.smartrecruiters.com/v1/companies/srinc/postings?limit=100&offset=0': () => json({
      totalFound: 2, offset: 0, limit: 100,
      content: [
        { id: '999', name: 'Backend Engineer', releasedDate: '2026-11-02T12:00:00.000Z', location: { city: 'Berlin', country: 'de', remote: false, fullLocation: 'Berlin, Germany' } },
        { id: '998', name: 'Sales Manager', releasedDate: '2026-11-02T12:00:00.000Z', location: { city: 'Berlin', country: 'de' } },
      ],
    }),
    'GET https://api.smartrecruiters.com/v1/companies/srinc/postings/999': () => json({
      id: '999', name: 'Backend Engineer', postingUrl: 'https://jobs.smartrecruiters.com/srinc/999-backend-engineer', applyUrl: 'https://jobs.smartrecruiters.com/srinc/999/apply',
      jobAd: { sections: { jobDescription: { title: 'Job Description', text: '<p>Kotlin and Spring services.</p>' }, qualifications: { title: 'Qualifications', text: '<ul><li>Backend experience</li></ul>' } } },
    }),
    'GET https://apply.workable.com/api/v1/widget/accounts/workltd?details=true': workableWidgetFails ? notFound : () => json({
      name: 'Work Ltd',
      jobs: [
        { title: 'Backend Engineer', shortcode: 'ABC123', url: 'https://apply.workable.com/j/ABC123', application_url: 'https://apply.workable.com/j/ABC123/apply', city: 'Berlin', country: 'Germany', telecommuting: false, published_on: '2026-11-03', description: '<p>Kotlin microservices</p>' },
        { title: 'Customer Success Lead', shortcode: 'DEF456', url: 'https://apply.workable.com/j/DEF456', city: 'Berlin', country: 'Germany', description: '' },
      ],
    }),
    'POST https://apply.workable.com/api/v3/accounts/workltd/jobs': () => json({
      total: 2,
      results: [
        { id: 1, shortcode: 'ABC123', title: 'Backend Engineer', remote: false, location: { country: 'Germany', city: 'Berlin', region: 'Berlin' }, published: '2026-11-03T00:00:00.000Z', workplace: 'hybrid' },
        { id: 2, shortcode: 'DEF456', title: 'Customer Success Lead', remote: false, location: { country: 'Germany', city: 'Berlin' } },
      ],
    }),
    'GET https://apply.workable.com/api/v2/accounts/workltd/jobs/ABC123': () => json({ description: '<p>Kotlin microservices</p>', requirements: '<ul><li>Backend</li></ul>', benefits: '' }),
  };
}

export function installFetchMock(opts) {
  const table = routes(opts);
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const key = `${init.method || 'GET'} ${url}`;
    const handler = table[key];
    if (!handler) return new Response(`no fixture for ${key}`, { status: 404 });
    return handler();
  };
  return () => { globalThis.fetch = original; };
}
