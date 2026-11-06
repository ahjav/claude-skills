# Portal catalog

Starting points for config. URL patterns change; treat every template as "last known" and let job-search correct it in config on first use. `{q}` = URL-encoded terms, `{loc}` = URL-encoded location.

Access: **fetch** = WebFetch usually works, **browser** = blocks AI fetching or renders with JavaScript, **api** = public JSON endpoint.

Cost: a browser portal costs many times more than a fetch or api one, because every page is read into the conversation and paged through. Record browser portals with `role: discovery` by default: they run on `discovery_days` to find companies, and job-search then adds those companies to `ats_boards` so later runs reach them through a feed. The cheapest source of all is at the end of this file: ATS feeds.

## General (all fields)

| Portal | Access | Search URL template | Recency filter |
|---|---|---|---|
| LinkedIn | browser | `https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}` | `&f_TPR=r86400` (24h), `r604800` (7d); remote `&f_WT=2`, hybrid `3`, on-site `1` |
| Indeed | browser | `https://<cc>.indeed.com/jobs?q={q}&l={loc}` (`de`, `fr`, `uk`; US: `www`) | `&fromage=1` / `3` / `7` / `14` (days) |
| Glassdoor | browser | `https://www.glassdoor.com/Job/jobs.htm?sc.keyword={q}&locKeyword={loc}` | `&fromAge=7` |
| Welcome to the Jungle | browser | `https://www.welcometothejungle.com/en/jobs?query={q}&aroundQuery={loc}` | sort by date on page |

## Germany

| Portal | Access | Search URL template | Recency filter |
|---|---|---|---|
| StepStone | browser | `https://www.stepstone.de/jobs/{q}/in-{loc}` | `?ag=age_1` (24h), `age_7` (7d) |
| XING | browser | `https://www.xing.com/jobs/search?keywords={q}&location={loc}` | on page |
| Bundesagentur Jobbörse | fetch or browser | `https://www.arbeitsagentur.de/jobsuche/suche?was={q}&wo={loc}&angebotsart=1` | `&veroeffentlichtseit=7` (days) |
| Jobware | browser | `https://www.jobware.de` (search on page) | on page |
| meinestadt.de | browser | `https://jobs.meinestadt.de` (search on page; strong for local and non-office jobs) | on page |
| Arbeitnow | api | `https://www.arbeitnow.com/api/job-board-api` (filter titles locally) | `created_at` |

## France

| Portal | Access | Search URL template | Recency filter |
|---|---|---|---|
| France Travail | browser | `https://candidat.francetravail.fr/offres/recherche?motsCles={q}&lieux={loc}` | `&emission=7` |
| APEC | browser | `https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles={q}` | on page |
| HelloWork | fetch or browser | `https://www.hellowork.com/fr-fr/emploi/recherche.html?k={q}&l={loc}` | `&d=w` (week) |

## US / UK

| Portal | Access | Search URL template | Recency filter |
|---|---|---|---|
| Totaljobs (UK) | browser | `https://www.totaljobs.com/jobs/{q}/in-{loc}` | `?postedWithin=7` |
| Reed (UK) | fetch or browser | `https://www.reed.co.uk/jobs/{q}-jobs-in-{loc}` | `?dateCreatedOffSet=lastweek` |
| ZipRecruiter (US) | browser | `https://www.ziprecruiter.com/jobs-search?search={q}&location={loc}` | `&days=7` |

## By field

Ask the user's field in setup and offer the matching rows. Search URLs here are mostly "open and search on page"; job-search records the pattern once it has run a search.

| Field | Portals (country) |
|---|---|
| Healthcare and care | NHS Jobs `https://www.jobs.nhs.uk` (UK), medi-jobs `https://www.medi-jobs.de` and Stellenmarkt of Deutsches Ärzteblatt `https://aerztestellen.aerzteblatt.de` (DE), Health eCareers `https://www.healthecareers.com` (US) |
| Education and teaching | Tes `https://www.tes.com/jobs` (UK, international schools), lehrer-online / state teacher portals (DE, per Bundesland), SchoolSpring `https://www.schoolspring.com` (US) |
| Hospitality, tourism, food | Hogapage `https://www.hogapage.de/jobs` (DE), Caterer.com `https://www.caterer.com` (UK), Hcareers `https://www.hcareers.com` (US) |
| Skilled trades, logistics, retail | meinestadt.de and Bundesagentur Jobbörse (DE), Indeed, Totaljobs, Reed |
| Finance, accounting, legal | eFinancialCareers `https://www.efinancialcareers.com`, Jobware (DE), Legal Cheek / LawCareers (UK) |
| Science and research | jobvector `https://www.jobvector.de` (DE), Nature Careers `https://www.nature.com/naturecareers`, EURAXESS (see employer-sites.md) |
| Non-profit, NGO, development | CharityJob `https://www.charityjob.co.uk` (UK), Idealist `https://www.idealist.org`, ReliefWeb and Impactpool (see employer-sites.md) |
| Creative, media, design | Behance jobs `https://www.behance.net/joblist`, Mediabistro `https://www.mediabistro.com/jobs` (US), The Dots `https://the-dots.com/jobs` (UK) |
| Tech | Dice `https://www.dice.com` (US), Built In `https://builtin.com/jobs` (US), GermanTechJobs `https://germantechjobs.de` and Get in IT `https://www.get-in-it.de` (DE), Berlin Startup Jobs `https://berlinstartupjobs.com`, Wellfound `https://wellfound.com/jobs`, Remotive (API `https://remotive.com/api/remote-jobs?search={q}`), We Work Remotely `https://weworkremotely.com` |
| Students, graduates, apprenticeships | Absolventa `https://www.absolventa.de` and Ausbildung.de `https://www.ausbildung.de` (DE), JobTeaser `https://www.jobteaser.com` (FR/EU), Handshake `https://joinhandshake.com` (US), Gradcracker / Prospects (UK) |

## ATS feeds (first choice)

Most companies publish openings through an applicant tracking system with a public feed. A feed returns every opening as structured data: no browser, no page rendering, nothing to scroll, and it reaches the cloud. Once a company is known, its feed is the cheapest and most reliable source, so job-search runs `ats_boards` before any portal.

All six systems below go under `ats_boards`. The feed script (`feed-script.md`) reads all of them on the user's computer. Without it, Claude reads only the first three with WebFetch.

Feeds that WebFetch can read (checked November 2026):

| ATS | Board URL shapes (detect from links) | Listing feed | Per-job detail | Questions in feed |
|---|---|---|---|---|
| Greenhouse | `boards.greenhouse.io/<slug>`, `job-boards.greenhouse.io/<slug>`, `job-boards.eu.greenhouse.io/<slug>`, `?gh_jid=` on a company site | `https://boards-api.greenhouse.io/v1/boards/<slug>/jobs` (no descriptions; add `?content=true` only for a small board) | `https://boards-api.greenhouse.io/v1/boards/<slug>/jobs/<id>?questions=true`: description in `content`, plus the form | Yes: label, required, field type and name, options |
| Lever | `jobs.lever.co/<slug>`, `jobs.eu.lever.co/<slug>` | `https://api.lever.co/v0/postings/<slug>?mode=json` (EU: `api.eu.lever.co`); includes `descriptionPlain`, `workplaceType`, `applyUrl` | `…/postings/<slug>/<id>` | No |
| Ashby | `jobs.ashbyhq.com/<slug>` | `https://api.ashbyhq.com/posting-api/job-board/<slug>?includeCompensation=true`; includes `descriptionPlain`, `isRemote`, `workplaceType`, `applyUrl`, compensation | in the listing | No |

Systems whose public pages and feeds refuse AI fetching (robots.txt), so WebFetch cannot read them and Claude never works around that: **Personio** (`<slug>.jobs.personio.de` / `.com`, very common in Germany; feed `https://<slug>.jobs.personio.de/xml`), **SmartRecruiters** (`jobs.smartrecruiters.com/<slug>`; feed `https://api.smartrecruiters.com/v1/companies/<slug>/postings`), **Workable** (`apply.workable.com/<slug>`). Record those companies under `ats_boards` too; the feed script covers them. Without the script, they are covered only when the company's own careers page lists the openings (then also add it under `employer_sites` with `access: fetch`), or through the browser on interactive runs.

How to read a feed with WebFetch: ask for only what the search needs, so the full JSON never enters the conversation. For example: "List postings whose title matches any of: backend engineer, kotlin, java. For each give id, title, location, remote or hybrid if stated, updated or published date, and the posting URL. Ignore the rest." WebFetch reads about the first 100,000 characters of a feed; a large board (Lever and Ashby include full descriptions, so a few dozen openings already fill that) comes back cut off and the result says so. Then call again with the `offset` it gives until the feed is covered.

Resolving a company to its feed: open its careers page once (WebFetch), look for the board URL shapes above in links or embedded scripts, then confirm the feed returns data. Record `{name, ats, slug}` under `ats_boards`. For Personio, SmartRecruiters and Workable, read the slug from the board link itself (the WebFetch check will be refused). A company on Workday, SuccessFactors, Taleo or a custom portal goes under `employer_sites` instead.

Older configs list board URLs under `watch_companies`; convert each to an `ats_boards` entry when its ATS is one of the six above.
