# Portal catalog

Starting points for config. URL patterns change; treat every template as "last known" and let job-search correct it in config on first use. `{q}` = URL-encoded terms, `{loc}` = URL-encoded location.

Access: **fetch** = WebFetch usually works, **browser** = blocks AI fetching or renders with JavaScript, **api** = public JSON endpoint.

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

## Company career pages

ATS boards usually allow fetching and are the most reliable source once a company is known:
Greenhouse `https://boards.greenhouse.io/<company>`, Lever `https://jobs.lever.co/<company>`, Ashby `https://jobs.ashbyhq.com/<company>`, Personio `https://<company>.jobs.personio.de`, SmartRecruiters `https://jobs.smartrecruiters.com/<company>`, Workable `https://apply.workable.com/<company>`. Many also expose JSON (`https://boards-api.greenhouse.io/v1/boards/<company>/jobs`, `https://api.lever.co/v0/postings/<company>`). List watched companies under `watch_companies` in config.
