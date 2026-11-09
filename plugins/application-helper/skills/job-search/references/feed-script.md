# Feed script

`scripts/fetch-feeds.mjs` (in the plugin folder) reads every company feed under `ats_boards` on the user's own computer and writes the matching postings to `<workspace>/feeds/`. It sends no model requests and opens no browser. It is the only way this plugin reads Personio, SmartRecruiters and Workable boards, because those refuse AI fetching; the user runs it, for their own search, at about one request per board.

Needs Node 18 or later (the CV builder already needs Node) and a workspace folder on the computer.

## Install

Copy the script into the workspace so it has a fixed path that survives plugin updates: `<workspace>/_profile/tools/fetch-feeds.mjs`. With a local workspace on the user's computer, write it there through the device bridge. On a plugin update, copy it again (the script prints its version with `--help`; compare with `VERSION` in the plugin copy).

## Run

```
node "<workspace>/_profile/tools/fetch-feeds.mjs" --workspace "<workspace>"
```

Options: `--terms "a, b"` and `--locations "a, b"` override config for one run, `--only <slug>` fetches one board, `--dry-run` prints without writing, `--all` reports every match as new, `--verbose` logs each request.

It reads `ats_boards`, `saved_searches` (the terms before the first `|`), `exclude_terms` and `feed_locations` from `_profile/config.md`. Matching: every word of a term appears in the title or description, and at least one in the title. Words split at spaces and punctuation, so `backend entwickler` matches "Backend-Entwickler:in", but a joined compound like "Softwareentwickler" needs its own term; the local language terms job-search adds cover both forms. A location filter keeps remote roles and roles whose location contains one of the entries.

## Schedule

Run it before the primary search task (for example 7:40 when the search runs at 8:00 or 9:00). The user creates this schedule on their computer; Claude gives the command with the paths filled in.

Windows (Task Scheduler, from a Command Prompt):

```
schtasks /Create /TN "Application Helper feeds" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 07:40 /TR "node \"<workspace>\_profile\tools\fetch-feeds.mjs\" --workspace \"<workspace>\""
```

If `node` is not found when the task runs, use the full path from `where node`.

macOS or Linux (`crontab -e`):

```
40 7 * * 1-5 node "<workspace>/_profile/tools/fetch-feeds.mjs" --workspace "<workspace>" >> "<workspace>/feeds/run.log" 2>&1
```

## Output

| File | Holds |
|---|---|
| `feeds/<yyyy-mm-dd>.json` | `postings`: matches first seen that day (merged across runs of the day); `runs`: per run, the terms and one line per board (ok, total, matched, new, error) |
| `feeds/latest.json` | every posting matching now, with `firstSeen` |
| `feeds/state.json` | ids seen before, last result per board; forgets ids not seen for 60 days |

Each posting: `id` (`<ats>/<slug>/<jobId>`), `ats`, `slug`, `company`, `jobId`, `title`, `location`, `workMode`, `postedAt`, `url`, `applyUrl`, `salary` (when the feed has it), `matchedTerms`, `firstSeen`, `new`, `description` (plain text, at most 12,000 characters), `signals` (ad language, required language levels, minimum years; see `matching.md`), and `note` when the description could not be loaded.

## Troubleshooting

- A board line says `FAILED: HTTP 404`: the slug or ATS changed. Open the company's careers page, find the board URL (shapes in `portals.md`, ATS feeds) and fix the entry.
- Lever boards hosted in the EU need `region: eu`; Personio boards on `.com` need `tld: com`; Personio ads in German only need `language: de`.
- The endpoints are the last known public ones. Greenhouse, Lever and Ashby were checked against live feeds; the Personio, SmartRecruiters and Workable adapters follow their public documentation and are confirmed on the user's first run. Workable tries its widget feed first, then its v3 API.
