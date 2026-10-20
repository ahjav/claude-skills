# Your application workspace

This folder is where your job search lives. Claude reads and writes these files; you can open and edit every one of them yourself.

## Layout

```
<workspace>/
  README.md                this guide
  pipeline.md              one row per role: stage, score, deadline, folder, link, dates
  _profile/                your personal data; every skill reads it, nothing leaves it unless you ask
    config.md              settings: portals, saved searches, filter level, formats, tracker, schedules
    profile.md             contact, years of experience, target level, salary rules, standard form answers
    facts.md               verified claims about you; the only source for CV and letter sentences
    stories.md             optional story bank for letters and interviews
    templates/
      cv/<variant>.md      master CV per variant (for example eu-en, us-en, fr-fr)
      cv/<variant>.docx    optional: your own Word layout for that variant
      cv/<variant>.format.md   optional: page size, font, margins for that variant
      letter/<variant>.md  cover letter structure per variant
  searches/                one report per job search run: queries, portals, counts, results
  1-to-apply/<nn>-<company>-<role>/   scored and queued, not sent yet
  2-active/<nn>-<company>-<role>/     applied or interviewing
  3-archive/<nn>-<company>-<role>/    closed: rejected, position closed, skipped, withdrawn, offer done
```

With Notion storage, the same pieces live under one base page: Profile, Facts, Config and Templates pages, a Pipeline database (one row per role, holding the ad, CV, letter, log and the built files) instead of the stage folders, and a Search runs database instead of `searches/`.

With the "one folder per stage" option, `2-active` and `3-archive` are replaced by `2-applied`, `3-interviewing`, `4-offer`, `5-closed`.

## Inside a role folder

| File | What it is |
|---|---|
| `ad.md` | Snapshot of the ad (ads disappear), score, verdict, fits, gaps, deadline |
| `cv.md` | Your CV tailored for this role, as text |
| `letter.md` | The cover letter for this role, as text |
| `<Name>-CV-<Company>.docx/.pdf` | The finished files you send, built from the .md |
| `log.md` | Dated log: what was sent, form answers given, replies, interview dates |

## Why the CV and letter exist as .md first

- **Review**: plain text is quick to read and correct in chat or any editor, and a change to one sentence does not mean redoing a layout.
- **Facts check**: before anything is built, every claim in the .md is matched against `facts.md`; claims that are stronger than the facts are rewritten or flagged.
- **One source, several outputs**: the same .md builds the Word file, the PDF and the plain text version for forms with a character limit, all consistent.
- **Record**: you can see later exactly what you sent each company, which matters when they call you.

Edit the .md, ask Claude to rebuild, and the .docx/.pdf follow.

## Skills

| Say | Skill |
|---|---|
| "find nursing jobs in Berlin", "run my job search" | job-search: searches your portals, filters by your level, sends hits to intake |
| paste links, "is this a match" | job-intake: checks the role is open, scores it, files it |
| "tailor my CV for X" | tailor-application: writes and builds CV and letter in the right variant |
| "let's go through the applications" | apply-run: one role at a time, never submits for you |
| "mark X as applied", "what's my pipeline" | tracker-sync: moves roles, syncs your tracker, summaries and deadlines |
