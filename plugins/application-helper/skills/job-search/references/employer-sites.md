# Employer sites

Many employers post only on their own career site: the UN system and other international organizations, EU institutions, national and local government, universities and research institutes, some NGOs and large companies. job-search treats each one like a portal with its own entry under `employer_sites` in config.

URLs are last known; job-search corrects them in config on first use. `{q}` = URL-encoded terms. Most of these sites render with JavaScript or use a search form, so expect the browser route.

## Config entry

```
employer_sites:
# - name: UN Careers
#   url: https://careers.un.org/jobopening?language=en
#   search_url_template:          # empty = open url, search or list on the page, match locally
#   access: browser               # fetch | browser | api
#   sector: un                    # un | intl | eu | gov-de | gov-fr | gov-us | gov-uk | academic | ngo | company
#   apply_via: Inspira account    # where applications are submitted, if not the ad page
#   notes: closing dates are strict (midnight New York time)
```

## UN system and international organizations

| Site | Access | URL |
|---|---|---|
| UN Secretariat (UN Careers) | browser | `https://careers.un.org/jobopening?language=en` (search on page) |
| UN Talent (aggregates UN agencies) | fetch | `https://untalent.org/jobs?search={q}` |
| Impactpool (UN, IFIs, NGOs) | browser | `https://www.impactpool.org/search?q={q}` |
| UNICEF | fetch or browser | `https://jobs.unicef.org/en-us/listing/` |
| UNDP | browser | `https://www.undp.org/careers` |
| UNHCR | browser | `https://www.unhcr.org/careers` |
| WHO | browser | `https://careers.who.int` |
| World Bank Group | browser | `https://www.worldbank.org/en/about/careers` |
| OECD | browser | `https://www.oecd.org/careers/` |
| ReliefWeb (humanitarian) | fetch | `https://reliefweb.int/jobs?search={q}` |

Aggregators (UN Talent, Impactpool) are good for discovery but lag. Always validate on the organization's own page: it is the source of truth for the open check and the closing date.

## EU institutions

| Site | Access | URL |
|---|---|---|
| EU Careers / EPSO, open vacancies | fetch or browser | `https://eu-careers.europa.eu/en/job-opportunities/open-vacancies` |
| EPSO competitions | fetch or browser | `https://eu-careers.europa.eu/en/job-opportunities/open-for-application` |
| EU agencies | browser | each agency's own careers page; list them as separate entries |

## Government

| Country | Site | Access | URL |
|---|---|---|---|
| Germany | service.bund.de (federal) | fetch or browser | `https://www.service.bund.de/Content/DE/Stellen/Suche/Formular.html?templateQueryString={q}` |
| Germany | Interamt (federal, state, municipal) | browser | `https://www.interamt.de` (search on page) |
| France | Choisir le service public | browser | `https://choisirleservicepublic.gouv.fr/nos-offres/` |
| US | USAJOBS | browser | `https://www.usajobs.gov/search/results/?k={q}` (an API exists but needs a key from developer.usajobs.gov) |
| UK | Civil Service Jobs | browser | `https://www.civilservicejobs.service.gov.uk` (search on page) |

## Academic and research

| Site | Access | URL |
|---|---|---|
| EURAXESS | fetch or browser | `https://euraxess.ec.europa.eu/jobs/search?keywords={q}` |
| jobs.ac.uk | fetch or browser | `https://www.jobs.ac.uk/search/?keywords={q}` |
| academics.de | browser | `https://www.academics.de/jobs` |

## Any other employer

When the user names an employer not listed here, find its careers page (WebSearch "<employer> careers"), open it, and work out whether it has a search URL, a plain list, or an ATS board (see portals.md, Company career pages). Record what works.

## Grades and experience (for the filter level)

Ads in these sectors often state a grade instead of years. Approximate minimum years of relevant experience; the ad's own stated minimum always wins.

| System | Grade → minimum years |
|---|---|
| UN Professional | P-1: 0, P-2: 2, P-3: 5, P-4: 7, P-5: 10, D-1: 15 |
| UN National Officer | NO-A: 1, NO-B: 2, NO-C: 5, NO-D: 7 |
| UN entry routes | Young Professionals Programme, JPO, internships, UN Volunteers: entry level, often with age or nationality limits |
| EU officials | AD5: 0, AD7: about 6, AST entry grades: 0 to 3; contract agents FG I to IV: read the ad |
| German public sector (TVöD/TV-L, Besoldung) | groups map to education level, not years; read the ad's requirements |
| US federal (GS) | GS-7: 1 year at GS-5 or a bachelor's with honors, GS-9: 1 year at GS-7 or a master's, GS-11 and up: 1 year at the next lower grade |

## Hard constraints common in these sectors

Check them in job-intake as hard constraints (score cap 40), and say which one failed:

- **Nationality or citizenship**: EU institutions (EU citizenship), many German and French civil service posts (EU citizenship, some national only), US federal (US citizenship), UN YPP (participating countries only), JPO (sponsoring country).
- **Languages**: UN posts often require English and French or another official language; EU competitions require two EU languages; national public sector usually requires the national language at a high level.
- **Degree level**: often a hard requirement tied to the grade.
- **Closing dates**: strict, often with a time zone (UN: New York time). Record date and time zone as the deadline.

## How applications differ

Record in the role's `ad.md` under "Process" so apply-run and tailor-application follow it:

- **UN system**: applications go through an account (Inspira for the UN Secretariat, each agency's own portal); the profile is a structured personal history form, not a free CV. Cover letter is often a free text field. Competency based interviews and written tests are common.
- **EU**: EPSO account; CV in Europass format is common for agency posts; competitions have tests before any interview.
- **German public sector**: quote the reference number (Kennziffer) in the subject line of the letter; letters usually in German; certificates (Zeugnisse) often required; questions on disability status or equal opportunity are the user's to answer.
- **US federal**: the federal resume is long and detailed (hours per week, salary, supervisor per job), unlike a one page private sector resume; consider a separate `us-fed` CV variant.
- **UK Civil Service**: success profiles and behaviour statements with a word limit; produce them as plain text variants.
