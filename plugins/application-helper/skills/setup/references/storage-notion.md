# Workspace in Notion (or another connected store)

Every skill in this plugin names files by their local path (`_profile/config.md`, `pipeline.md`, `<stage>/<role>/ad.md`). Those paths are logical. When `storage: notion`, resolve them with the mapping below instead of the file system. Read the Notion connector's own instructions before the first call in a session.

## Finding the workspace

Run this at the start of every skill, before reading any file:

1. If a local `_profile/` exists (session working directory or the user's linked folder), storage is local.
2. Otherwise search Notion for a page titled "Application Helper" (or the title the user chose) whose first line is the marker `application-helper workspace` (or `application-kit workspace`, from before the rename). If found, storage is notion; read its Config page.
3. Neither found: run setup.

Scheduled task prompts always name the base page URL, so unattended runs skip the search.

## Layout

```
<Base page>                      first line: "application-helper workspace" (marker, keep it)
  README                         the workspace guide
  Profile                        profile.md content
  Facts                          facts.md content
  Config                         config.md content as a code block (key: value lines, same as local)
  Stories                        optional
  Templates
    CV · <variant>               one page per variant (markdown-format content); attach the variant .docx if any
    Letter · <variant>
  Pipeline (database)            one row per role; replaces pipeline.md and the stage folders
  Search runs (database)         one row per run and per digest; replaces searches/
```

### Pipeline database

Properties: Company (title is "<Company>: <Role>"), Role, Score (number), Verdict (select: Apply, Maybe, Skip), Stage (select: To apply, Applied, Interviewing, Offer, Closed), Reason / next step, Deadline (date, with time when the ad gives one), Link (URL), Source, Variant, Added, Applied, Updated (dates).

Each row's page holds, as sections: the `ad.md` content, then toggles "CV" and "Letter" with the `cv.md` and `letter.md` content, then "Log" (the `log.md` lines). Built .docx and .pdf files are uploaded as attachments to the row's page.

Stage moves change the Stage property; there are no folders to move. Views: Board by Stage, Table "To apply" sorted by Score, Calendar by Deadline.

### Search runs database

Properties: Run (title, "<yyyy-mm-dd> <hh:mm> <role>"), Date, Role (primary, check, fallback, manual, digest), Status (running, partial, complete), Portals done, Portals pending, Found, Validated, Apply count. The page body is the run report described in job-search.

## Working rules

- Building documents still happens in the session workspace: write the .md there from the Notion page, build, then upload the files to the row. Delete nothing in Notion; replace attachments by uploading the new version and noting it in Log.
- Read a page fresh before editing it: the user may have tuned a CV or letter by hand in Notion.
- `tracker` in config is `notion-native`: the Pipeline database is the tracker, so tracker-sync has nothing to mirror.
- The user may keep a local copy as well; then local stays the source of truth and Notion is a tracker mirror (the older setup), not storage.

## Other stores

Google Drive (with its connector) works the same way: the base page becomes a folder, pages become Google Docs, the Pipeline database becomes a Google Sheet with the same columns, Search runs a second sheet. Other stores: map the same structure and record the mapping under `storage_map` in Config.
