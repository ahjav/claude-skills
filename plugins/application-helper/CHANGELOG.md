# Changelog

## 0.8.1
- Extension: a Searches section lists the user's portals and employer sites times saved search terms as search links, with a **Next search** walk-through; saved listings are tagged with the portal and term that found them. Portals Claude can fetch start unticked.

## 0.8.0
Search, extraction and matching.
- Chrome extension (`extension/`): reads `JobPosting` data from ad pages and result cards from search pages with learned per-portal list profiles, reads matching ads in the background with the user's session (LinkedIn off by default), and saves to `feeds/browser-<date>.json` in the feed format. "Map the pending portal" lets Claude write a portal's profile once from a captured page.
- Signals on every feed and browser posting: ad language, required language levels, minimum years.
- Matching before scoring (`job-search/references/matching.md`): pre-filters on duplicates, excludes, title relevance, location, required language level, years, recency and closing date; `_profile/feedback.md` with the user's rules, verdict overrides, and outcomes by source and term, maintained by tracker-sync and used by job-search and job-intake.

## 0.7.0
Lower usage: the browser is now a last resort.
- `ats_boards` in config: target companies searched through their applicant system feed first on every run, with no browser. Claude reads Greenhouse, Lever and Ashby feeds itself.
- Feed script `scripts/fetch-feeds.mjs` (Node 18+, no packages, with tests): runs on the user's computer on their own schedule, reads all six systems including Personio, SmartRecruiters and Workable (which refuse AI fetching), filters by terms, excludes and locations, and writes new matches with descriptions to `feeds/`. job-search and job-intake use that output instead of fetching. Setup installs it into `_profile/tools/`. Setup starts with companies; job-search and job-intake add companies they find on portals.
- Browser portals get a `role`: `discovery` portals run only on `discovery_days`. Scheduled runs never use a browser; browser portals are listed as interactive only in the digest.
- job-intake reads ads from the feed when the ATS is known, records an **ATS** line and, for Greenhouse, the form questions in `ad.md`.
- tailor-application writes `answers.md` (ready to paste form answers with character counts and flags) at tailoring time.
- apply-run uses `answers.md`, opens the direct form URL, caps browser actions with `browser_budget`, reads a form once as data (JavaScript field read in the playbooks) instead of screenshots, and verifies once at the end. Link mode is the recommended default.
- job-search and setup add local language equivalents of the search terms (for example German titles for searches in Germany) when the profile's language limits allow roles in that language, saved as `# local: <code>` lines in `saved_searches`.
- Search reports include a cost line: feeds, fetches and browser pages used.

## 0.6.0
- Renamed from application-kit to Application Helper (`application-helper`). Existing workspaces keep working; Notion workspaces with the old marker are still found. Uninstall application-kit after installing application-helper.

## 0.5.0
- Scheduled searches run as a chain: main search, a check one hour later that runs it if missed and sends the digest, and a fallback around 13:00. A daily run record prevents repeated or skipped portals.
- Notion (or Google Drive) as full workspace storage: base page, Pipeline and Search runs databases.

## 0.4.0
- Field-agnostic: occupations, licenses and registrations, schedule limits, portals by field.

## 0.3.x
- Employer career sites (UN system, EU institutions, government, academic, any company), grade to experience mapping, sector hard constraints.
- Local files as the default tracker; show files in chat; sync back from Notion.

## 0.2.0
- New job-search skill: portals, saved searches, browser fallback, experience filter, validation through job-intake.
- Setup: filter level, transparent folder structure, several CV and letter variants, Claude Project option, schedules and reminders, post-setup walkthrough.

## 0.1.x
- Initial skills: setup, job-intake, tailor-application, apply-run, tracker-sync.
