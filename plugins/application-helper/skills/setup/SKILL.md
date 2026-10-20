---
name: setup
description: This skill sets up an application-helper workspace for a job search. Use when the user says "set up my job search", "set up application helper", "start a new job search workspace", "configure my CV format", "add a CV template", "change my filter level", "change my portals", "schedule my job search", "change my tracker", or when another application-helper skill finds no _profile folder.
---

# Setup

Create the workspace and the personal files every other skill reads. Run once; rerun any step later to change it (each step stands alone).

Ground rules for this conversation:
- Say what each file or folder is for at the moment it comes up. Never create something the user has not seen described.
- Use AskUserQuestion for choices, plain questions for free text. Ask only for what is missing; skip anything the user already said or that an existing `_profile/` already holds.
- Keep a task list: one item per step below, ticked as each finishes.

## 1. Where the workspace lives

Ask with AskUserQuestion:

- **A folder on your computer** (through the Claude desktop app link). Best when the user wants to open and edit files directly. Use the device tools; if they are absent, explain how to link this chat (open it in the desktop app on that computer, send a message) or offer the next option.
- **This session's workspace**. Works anywhere, but the user sees files only when Claude sends them, and files do not carry over to other sessions, so scheduled searches are not possible with it.
- **Notion** (or another connected store such as Google Drive; offer only when the connector is connected, otherwise mention it can be connected). Everything lives in one base page: profile, templates, a Pipeline database instead of folders, and search run reports. Works from any device and lets scheduled searches run in the cloud even when the computer is off. Ask whether to use an existing page (the user gives the link or name; search for it) or to create a new private page "Application Helper". Follow `references/storage-notion.md` for the layout. Record `storage: notion` and `notion_base: <url>` in the Config page.
- **A Claude Project** (offer only after checking): search the available tools (ToolSearch "create project") for one that creates a Claude Project. If one exists, offer to create a project named "Job search <year>" and keep the profile files in it. If none exists, do not offer it as an option; say once, plainly, that Claude cannot create a Project from here, and that the user can create one themselves and add `README.md`, `_profile/profile.md`, `_profile/facts.md` and `_profile/config.md` as project knowledge so every chat in that project starts with them. A Project holds instructions and reference files, not a working folder, so the role folders still live in one of the two options above. Do not guess menu paths.

If an existing folder already holds applications in another layout, note it for step 12.

## 2. Show the structure, then create it

Before creating anything, show the layout from `references/workspace-guide.md` (the tree and the role folder table) and ask with AskUserQuestion:

- **Folder mode**: three folders (to apply, active, archive; recommended) or one folder per stage (to apply, applied, interviewing, offer, closed).
- **Numbering**: prefix role folders with a running number (recommended, keeps the order of intake visible).

With `storage: notion`, show the Notion layout from `references/storage-notion.md` instead, then create the base page (or use the chosen one; put the marker line first), its child pages and the two databases with their views. Otherwise create `_profile/`, `_profile/templates/cv/`, `_profile/templates/letter/`, `searches/`, the stage folders and `pipeline.md` (from `references/pipeline.md`). Copy `references/workspace-guide.md` to the workspace as `README.md`. Copy `config.md`, `profile.md`, `facts.md` into `_profile/`. List what was created, one line each.

## 3. Profile

Collect and write to `_profile/profile.md`:

- Contact block as shown on documents (name, email, phone, city, LinkedIn, and a portfolio or work samples link when the field uses one: GitHub, Behance, publications, personal site).
- **Field or occupation** (any field: healthcare, education, trades, hospitality, finance, tech, public sector...), **years of professional experience** in it, and **target level** (junior, mid, senior, lead). These drive the filter in step 4.
- Postal address, work permit in plain words, notice period, relocation.
- Professional licenses, registrations and certifications that employers check (nursing registration, teaching qualification, driving license classes, trade certificates), and shift or schedule limits (nights, weekends, part time) when relevant to the field.
- Search constraints: target roles, locations, work mode, language limits, minimum and target salary, industries to prefer or avoid.
- Salary rules, standard form answers (consent boxes are always left for the user), writing style rules for external text, letter language.

## 4. Filter level for suggested positions

Explain in one or two sentences that job-search and job-intake drop postings outside the chosen range before scoring, so the user is not shown ads that ask for far more experience. Then ask with AskUserQuestion, filling in the user's own years in the descriptions:

- **Exact match**: ad minimum years at or below yours, same level as your target.
- **Stretch**: up to 2 years above yours, or one level up.
- **Long stretch**: up to 4 years above yours, or two levels up.

Example to show: with 0 to 1 years, an ad asking at least 4 years appears only under long stretch.

Second question: should the same level apply to must-have requirements such as skills, tools, certifications or specializations (exact = all must-haves in your facts, stretch = one missing, long stretch = closely related ones count)? Legally required licenses are never stretched. Record `experience_filter` and `filter_requirements` in config.

## 5. Portals, employer sites and searches

Ask which job portals the user uses (free text, plus a multi-select of the portals in `../job-search/references/portals.md` that fit their country and field: the general ones plus the "By field" rows for their occupation). Record each under `portals` in config with its `url_template` and the `access` route from the catalog. Ask for:

- Search terms (several allowed), locations, work mode, and terms to exclude. Save as `saved_searches` and `exclude_terms`.
- Employers that post only on their own site. Ask with AskUserQuestion (multi-select) whether the user targets any of: the UN system or other international organizations, EU institutions, government (their country), universities and research, specific companies. For each picked sector, offer the sites from `../job-search/references/employer-sites.md` as a multi-select, plus free text for any other employer. Record each under `employer_sites` with url, access, sector and where applications are submitted. For an employer not in the catalog, find its careers page and confirm it with the user.
- When a picked sector has hard constraints the profile does not answer yet (citizenship for EU institutions or civil service, official languages for the UN), ask for them now and add them to profile.md.
- When a sector needs a different CV shape (UN personal history profile, US federal resume, Europass), mention it so step 6 can add a variant.

Explain that portals and sites marked browser need the Claude app's browser for reading, and that the user may need to sign in there once; Claude never types passwords.

## 6. CV and cover letter templates (several allowed)

Explain: the user can keep more than one CV and letter, for example an EU English CV, a US resume, a French CV, an English and a French letter. tailor-application picks the right one per ad.

1. Ask which variants they need (multi-select: EU English, US English, French, German, plus free text). Name each `<region>-<language>`, for example `eu-en`, `us-en`, `fr-fr`.
2. For each variant, ask the user to attach the CV and cover letter here, or to put them in `_profile/templates/cv/` and `_profile/templates/letter/` in the workspace and say when done. Accept .docx, .pdf, .md or pasted text. Read every file before using it.
3. For each CV: write `templates/cv/<variant>.md` in the format of `../tailor-application/references/markdown-format.md`. If the user wants their own Word layout kept, store the .docx as `templates/cv/<variant>.docx`. For each letter: write `templates/letter/<variant>.md` with its structure (start from `references/letter-template.md` when the user has none).
4. Ask per variant only what differs from the defaults: page size (A4 or Letter), page limit, photo, date of birth, section order, font. Write differences to `templates/cv/<variant>.format.md` as `key: value` lines (same keys as config).
5. Ask how to choose a variant and record `variant_rules` in config, for example: ad written in French → fr-fr; role in the US or US company → us-en; otherwise eu-en. Set `default_variant`.
6. Build each CV variant once with tailor-application's builder to confirm format and page limit.

## 7. Facts

`facts.md` is the single source of truth for claims. Seed it from the CVs collected in step 6: one claim per line, grouped by role, numbers and scope exactly as the user confirms. Mark anything inferred `[unconfirmed]` and ask the user to confirm or drop it. If the user has a story bank (Notion page, doc, notes), link or copy it to `_profile/stories.md`.

## 8. Formats

Record shared defaults in `_profile/config.md`: output formats (docx, pdf), letter word range, plain text character limits, file naming pattern (default `<First>-<Last>-CV-<Company>` and `<First>-<Last>-Cover-Letter-<Company>`).

## 9. Tracker

Explain the trade-off in two or three lines, then ask with AskUserQuestion:

- **Local files only** (recommended default): `pipeline.md` is the tracker. One place to look, nothing to keep in sync, works with manual edits to CVs and letters in any editor. Claude shows the pipeline, any ad, CV or letter in the chat on request ("show my pipeline", "show the letter for X").
- **Local files plus Notion, Google Sheets or another connected tool**: the files stay the source of truth and the tracker is a mirror for viewing on other devices or sharing. Costs a sync step after each change, and edits made directly in the tracker are pulled back only when the user asks for a sync.

With `storage: notion`, skip this step: the Pipeline database is the tracker (`tracker: notion-native`). For an external tracker, find it, read its schema, and record `field_map` (including deadline) and `stage_values` in config.

## 10. Apply mode

Record `apply_mode` (link, guide, prefill) and `personal_data` (omit, ask, include) in config.

## 11. Schedules and reminders

Claude has no separate reminders app; the way to get Claude to act or notify later is a **scheduled task**, which runs on its own and can send a push or email notification when done. Check what this session offers (ToolSearch "scheduled task trigger"); use the scheduled task tools, never the local cron tools, which vanish when the session ends. Offer with AskUserQuestion (multi-select):

- **Recurring job search** (recommended): a chain of up to three daily tasks, set up as described in `../job-search/references/scheduled-runs.md`. Explain the reason in two lines: a task on the computer sees every portal but runs only when the computer is on; a cloud task always runs but cannot read portals that block AI and can only store results with Notion storage. Then ask:
  - days and time of the main search (default weekdays, 8:00 or 9:00, user's time zone);
  - whether to add the check run one hour later (runs the search if it was missed, then sends the digest) and the fallback around 13:00 (runs it if both were missed). Recommend both when any task needs the computer.
  Place each task (cloud or computer) by the table in that reference. With storage in the session workspace only, do not create search tasks; explain why and offer a computer folder or Notion.
- **Deadline and follow-up digest**: included in the check run when the chain is set up. Offer it as its own daily or weekly task only without the chain: lists deadlines in the next 3 days, interviews coming up, and applications without reply for more than 14 days.
- **One-off reminder per deadline**: job-intake creates one scheduled task per role with a deadline, the day before. Mention that many roles means many tasks.
- **Calendar events**: only if a calendar connector is connected; job-intake adds deadline events there.

Mark tasks that need the computer as such, and say that they run only while the computer is on with the Claude desktop app open; a missed day is caught up by the next run's search window. After creating, say in one sentence whether each task's runs need approval, and record the task names and ids under `schedules` in config. If no scheduling tool is available, say so and offer to run the digest whenever the user asks for "my pipeline".

## 12. Migrate (optional)

When an older folder of applications exists, list each role, infer its stage from the tracker or files, propose the moves in a table, and move only after the user confirms. Keep originals until the user checks the result.

## Finish: explain what was created

End with a plain language walkthrough, not a file dump:

1. **Where it is**: the workspace location (folder or Notion base page, and the project, if one was made).
2. **The folders**, one line each: `_profile/` (your data and settings, read by every skill), `templates/` (one CV and letter per variant), `searches/` (a report per search run), the stage folders (a role moves through them as it progresses), `pipeline.md` (the overview), `README.md` (this guide, to reread any time).
3. **A role folder**, one line per file: ad snapshot, tailored `cv.md` and `letter.md`, built .docx/.pdf, log.
4. **Why the CV and letter are .md first**: easy to review and correct before anything is built; every claim is checked against `facts.md`; one text builds the Word file, the PDF and the plain text version for forms; and it keeps a record of what each company received.
5. **What is set**: filter level, portals, variants, tracker, the scheduled tasks with their times and where each runs (cloud or computer); and which values are still empty.
6. **Next step**: run job-search with a first set of terms, or paste links for job-intake.
