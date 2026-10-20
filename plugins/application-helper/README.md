# Application Helper

Run a job search from ad to submitted application, with one workspace folder and two personal data files.

## Install

Claude Code (2.1.275 or later):

```
/plugin install application-helper --marketplace ahjav/claude-skills
```

Older versions:

```
/plugin marketplace add ahjav/claude-skills
/plugin install application-helper@ahjav-skills
```

Claude app: add the marketplace `ahjav/claude-skills` in your plugin settings and install application-helper, or install the `.plugin` file from the release page.

After installing, say "set up my job search" to run setup.

## Skills

| Skill | Use it to |
|---|---|
| `setup` | Create the workspace (local folder or session; Claude Project when available), profile, filter level, portals and searches, CV and letter variants, facts, formats, tracker, scheduled searches and reminders. Explains every folder and file. Run once; rerun any step. |
| `job-search` | Search your portals and employers' own career sites (UN, EU, government, universities, companies) with your terms (or saved searches), drop postings outside your filter level, and send the rest to job-intake. Uses the Claude app's browser for portals that block AI fetching. Runs on a schedule too. |
| `job-intake` | Paste links (any job board, browser tabs, saved jobs) or get them from job-search. Checks each role is open, applies the filter level, scores it, files it, records deadlines. |
| `tailor-application` | Pick the right CV and letter variant (EU, US, FR...), write the tailored CV and cover letter for a role, check every claim against your facts, build DOCX/PDF in your format. |
| `apply-run` | Go through the queue one role at a time. Default: link plus only the role specific data (files, salary, free text answers). With browser access: guide per field or prefill, always stopping before submit. |
| `tracker-sync` | Move roles between stages, keep the pipeline and your tracker (Notion, Google Sheets or markdown) in sync, summaries and the deadline digest. |

## Workspace layout

```
<workspace>/
  README.md          guide to the workspace (copied by setup)
  pipeline.md        one row per role: stage, score, deadline, folder, link, dates
  _profile/
    config.md        filter level, portals, saved searches, variants, formats, tracker, schedules
    profile.md       contact, years of experience, target level, salary rules, form answers
    facts.md         verified claims; the only source for CV and letter sentences
    stories.md       optional story bank
    templates/cv/<variant>.md (+ optional .docx, .format.md)
    templates/letter/<variant>.md
  searches/          one report per job-search run and per digest
  1-to-apply/<nn>-<company>-<role>/
  2-active/<nn>-<company>-<role>/      applied or interviewing
  3-archive/<nn>-<company>-<role>/     closed, rejected, skipped, withdrawn, offer
```

Each role folder holds `ad.md` (snapshot, score, fit, gaps, deadline), `cv.md`, `letter.md`, the built files, and `log.md`. The CV and letter are written as markdown first so they can be reviewed and fact-checked before one source builds the DOCX, PDF and plain text versions. Full explanation: `skills/setup/references/workspace-guide.md`.

With `folder_mode: stages` in config, the three folders become one per stage instead (to-apply, applied, interviewing, offer, closed).

## Storage and scheduled searches

The workspace is a local folder or a Notion base page (Google Drive works the same way). Scheduled searches run as a chain: the main search, a check one hour later that runs it if missed and sends the digest, and a fallback around 13:00. Tasks on the computer cover every portal but run only when it is on; with Notion storage the main search can run in the cloud for portals that allow fetching. Details: `skills/job-search/references/scheduled-runs.md`.

## Requirements

- Node.js with the `docx` package for building documents (`npm i -g docx`), and LibreOffice for PDF conversion. Without them, Claude falls back to the docx and pdf skills.
- Optional: a browser (the Claude app's built-in browser preferred, Claude in Chrome as fallback) for portals that block fetching and for guide and prefill modes. Without it, job-search lists links for blocked portals and job-intake asks you to paste blocked ads.
- Optional: scheduled tasks for recurring searches and the deadline digest; a calendar connector for deadline events.
- Optional: a Notion or Google Sheets connector for the tracker.

## Privacy

The plugin holds no personal data. Everything personal lives in `_profile/` inside your own workspace. File uploads in application forms are always done by you.

## Releasing updates (maintainers)

Bump `version` in `.claude-plugin/plugin.json` on every release; users keep their cached copy until it changes. Do not set `version` in the marketplace entry. Never change `name`: to rename, add a `renames` entry in `marketplace.json`. Add a line to `CHANGELOG.md`.
