---
name: job-search
description: This skill searches the user's job portals and employer career sites (UN, EU, government, universities, companies) for new postings with their search terms, filters them by the configured experience level, and validates every hit with job-intake. Use when the user says "find jobs", "search for jobs", "look for new postings", "search LinkedIn for", "run my job search", "any new roles for nursing", "check the UN careers site", "search government jobs", or when a scheduled job search run starts.
---

# Job search

Search the portals and employer sites listed in `_profile/config.md` with the user's terms, drop what the experience filter rules out, and hand every remaining posting to job-intake for the open check, scoring and filing. Never score or file roles here; job-intake owns that.

## Before starting

Locate the workspace first (local folder or Notion; see `../setup/references/storage-notion.md`, Finding the workspace); with `storage: notion`, the paths below map to Notion pages and the Pipeline database. Read `_profile/config.md` (sections ATS boards, Portals, Employer sites, Searches, Filtering), `_profile/profile.md` (Search section, years of experience) and `pipeline.md`. If `_profile/` is missing, run setup first. If config lists no ATS boards, portals or employer sites, ask where to search (offer the ones in `references/portals.md` and `references/employer-sites.md` that fit the user's country and sector, and ask for target companies to resolve into `ats_boards`), save them to config, then continue.

**Cost rule.** Reading pages in a browser is by far the most expensive thing this skill does: every page goes into the conversation, and paging multiplies it. Search in this order and stop going down the list when the run has enough candidates: ATS feeds, then fetch and api portals, then browser portals. Never use a browser on a scheduled run.

When the user names an employer or sector in the message ("anything at the UN", "German federal jobs"), search those employer sites for this run even if they are not in config, and offer afterwards to save them.

## 1. Settle the search terms

- Terms the user gives in the message win. Accept several at once ("staff nurse, ward nurse", "accountant, financial controller", "kotlin backend") and treat each as its own query.
- No terms given: use `saved_searches` from config. None saved: build two or three from profile.md (target role, core skills or field, level) and show them in one line before running.
- Location, work mode and recency come from the message first, then `saved_searches`, then profile.md. Default recency: the last 7 days on an interactive run, the window since the last run on a scheduled run (`last_run` in config, fallback 24 hours).
- After an interactive run, offer once to save new terms to `saved_searches`.

## 2. ATS boards first

For each entry in `ats_boards`, WebFetch its listing feed (`references/portals.md`, ATS feeds) and ask only for postings whose title matches the terms, with id, title, location, work mode, date and URL. Apply the recency window to the feed's date. No browser; call again with the given `offset` only when WebFetch says the feed was cut off. Mark a board whose feed fails (404, empty, changed shape) in the run report; after two failed runs in a row, open its careers page once to re-resolve the slug or ATS.

## 3. Pick the access route per portal

Then the portals and employer sites, using the route recorded in config (`access: fetch | browser | api`), learned on first use:

1. **API or fetch**: portals with a public API or plain HTML listing (see `references/portals.md`). Use WebFetch on the search URL built from the portal's `url_template`, and ask for the listing fields only, never the whole page.
2. **Browser**: only on an interactive run, only for portals whose `role` is `search`, or `discovery` on a day in `discovery_days` (a browser portal without `role`, from an older config, counts as `discovery`). Skip the rest and say so in one line of the report. Prefer the built-in browser (the Claude app's own browser pane); read the `built-in-browser` skill before its first use. Fall back to Claude in Chrome only when the built-in browser is unavailable and the user allows it (read the `chrome-browser` skill first). Open the search URL with the recency filter already in it, read results once with get_page_text (not screenshots, not read_page per element), and page only while new results are inside the window, at most `max_results_per_query`.
3. **No browser available**, or a browser portal skipped by its role: list its search link in the final report so the user can open it. Never work around a block with curl, mirrors or caches.

### Discovery: turn portal hits into feeds

For every posting found on a portal or aggregator, check its apply link against the board URL shapes in `references/portals.md`. When the company's ATS has a public feed and the company is not yet in `ats_boards`, add `{name, ats, slug}` there and list the additions in the report. Over time the browser portals matter less: they find companies, the feeds keep watching them.

### Employer sites

Sites in `employer_sites` (and the older `watch_companies` list) are searched the same way, with these differences (details in `references/employer-sites.md`):

- With a `search_url_template`, run each query there. Without one, open `url`, use the site's own search box or filters when it has them, otherwise read the full list of openings and match titles and summaries against the terms locally. Many of these sites are small enough to read in full.
- Terms: public sector and international titles rarely match private sector wording (a "software developer" is an "Information Systems Officer" at the UN or a "Referent IT" in German administration; a "marketing manager" may be a "Communications Officer" or "Chargé de communication"). For each site, also try the sector's usual title words for the user's role, and record the ones that produced hits under that site's `terms` in config.
- Read the grade (P-3, AD7, GS-12, E13) as well as the years; the grade table in `references/employer-sites.md` feeds the experience filter.
- Capture the closing date and its time zone from the listing whenever shown.
- Aggregators (UN Talent, Impactpool) are for discovery: pass job-intake the organization's own link when the aggregator shows it.

Record the route that worked back in config (`access:`), so later and scheduled runs skip failed attempts. If a `url_template` returns nothing or redirects to a home page, open the portal's search in the browser, run the query by hand, copy the resulting URL pattern into config, and continue.

Sign in: never enter credentials. If a portal needs the user signed in, ask the user to sign in in the browser pane once; the session persists. Decline non-essential cookies.

## 4. Collect the candidates

For each query and portal, collect title, company, location, work mode, posted date, link, and the years or level shown in the listing. Then:

- **Dedupe** by link and by company plus title across portals and against `pipeline.md` (any stage, including Closed). Note re-posts of roles the user was already rejected from instead of dropping them silently.
- **Experience pre-filter** (config `experience_filter`, see below). Apply it to what the listing shows; when the listing has no years or level, keep the posting and let job-intake read the full ad.
- **Title pre-filter**: drop titles that are plainly outside the target level (for example "Working Student", "Trainee", "Head of", "Director" for a mid-level search), and any title containing a word in `exclude_terms`.

### Experience filter levels

Compare the ad's minimum years and level with the user's years (profile.md) and target level.

| Level | Keep when |
|---|---|
| exact | Ad minimum years at or below the user's years, and the title level equals the target level |
| stretch | Ad minimum years at most 2 above the user's years, or one level above the target |
| long_stretch | Ad minimum years at most 4 above the user's years, or two levels above the target |

Ranges ("3 to 5 years") use the lower bound. "Nice to have" years do not count. A user with 0 to 1 years and an ad asking at least 4 is out for exact and stretch and kept only for long_stretch. The same level applies to must-have requirements (skills, tools, licenses, certifications, specializations) when `filter_requirements: yes` (older configs: `filter_stack`): exact keeps ads whose must-haves are all in facts.md, stretch allows one missing must-have, long_stretch also allows closely related ones (a different tool for the same job, a neighboring specialization). A legally required license or registration the user lacks is never stretched; it is a hard constraint in job-intake.

Count what each filter dropped; it goes in the report.

## 5. Validate with job-intake

All pre-filters run on listing data before anything goes to job-intake; job-intake reads full ads, so every posting dropped here saves a full read. Pass the surviving links to the job-intake skill as one batch, with `source: job-search`, the query that found each, the portal, and for ATS feed hits `ats: <ats>/<slug>/<id>` so job-intake reads the feed's detail instead of the page. For browser-read ads, pass the page text already read rather than reopening the page. job-intake reads each full ad, checks it is open, re-applies the experience filter to the full text, scores, and files it. Do not create role folders or pipeline rows here.

On a large batch (more than 15), show the list and the count per portal first on an interactive run, and ask whether to validate all or a subset. On a scheduled run, validate the top 15 by listing recency and keep the rest in the run file.

## 6. Report

Write `searches/<yyyy-mm-dd>-<hhmm>.md` in the workspace (a Search runs row with `storage: notion`): queries, portals and route used, counts found / deduped / filtered / validated, the job-intake result table, uncovered or skipped portals with their search links, companies added to `ats_boards`, failing feeds, and listings held back. Add a cost line: number of feeds fetched, pages fetched, and pages read in the browser, with the share of Apply roles that came from feeds. A rising browser count is the signal to add more companies to `ats_boards`. Update `last_run` per portal and board in config.

To the user: lead with counts per verdict, then the short job-intake table (company, role, score, verdict, one-line reason), then one line per portal that was not covered and why. Offer tailor-application for the Apply roles.

## Scheduled runs

When started by a scheduled task, nobody is watching: use saved searches and ask no questions. Scheduled runs use ATS feeds and fetch or api portals only; browser portals are recorded as interactive only (not pending) and listed with their links in the digest. Follow `references/scheduled-runs.md` for the role named in the prompt (primary, check or fallback): read today's run record first, run only the portals still pending that this environment can reach, update the record, and send the digest when the role calls for it. Write the run report to the same record (local run file or the Search runs row in Notion).
