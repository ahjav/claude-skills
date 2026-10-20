---
name: tailor-application
description: This skill writes a tailored CV and cover letter for a specific role and builds them in the user's own format. Use when the user says "create the CV and cover letter", "tailor my CV for", "write a cover letter for", "I need an Anschreiben", "make a plain text version under 4000 characters", "generate the PDFs", or after job-intake queues roles to apply.
---

# Tailor application

Write the CV variant and cover letter for one or more queued roles, verify every claim, and build the files in the user's configured format.

## Before starting

Locate the workspace first (local folder or Notion; see `../setup/references/storage-notion.md`, Finding the workspace); with `storage: notion`, the paths below map to Notion pages and the Pipeline database. Read `_profile/config.md`, `_profile/profile.md`, `_profile/facts.md`, `_profile/stories.md` (if present) and the role's `ad.md`.

Pick the variant: apply `variant_rules` from config to the ad (language it is written in, country of the role, company HQ), else `default_variant`. When two rules fit or none is clear, ask once with AskUserQuestion. Then read `_profile/templates/cv/<variant>.md`, `_profile/templates/letter/<variant>.md`, and `templates/cv/<variant>.format.md` and `templates/cv/<variant>.docx` when present. Note the variant in the role's `log.md`. Follow the role's **Process** line in `ad.md`: a reference number goes in the letter's subject line; a structured profile form (UN personal history profile, competency statements) gets plain text answers per field instead of a CV file; a sector variant (`us-fed`, `europass`) wins over the regional one when it exists. Older workspaces with `_profile/cv-base.md` and `_profile/letter-template.md` and no templates folder: use those as the single variant.

Recheck the ad link is still open (a quick fetch or browser read); if closed, move the role to the archive via tracker-sync and stop for that role.

If the user has an installed cover letter skill of their own, follow its writing guidance, but the facts check, format and file rules here still apply.

## 1. CV variant

Copy the variant's CV (`templates/cv/<variant>.md`) to the role folder as `cv.md`, then tailor:

- Summary: lead with the skills, qualifications and domain the ad names, in the user's words.
- Reorder and trim bullets so the strongest matches come first; drop bullets irrelevant to the role before shortening relevant ones.
- Skills line (and licenses or certifications the ad asks for): put the ad's named skills first, only skills listed in facts.md, with their honest depth.
- Never add a skill, number, tool or responsibility that is not in facts.md.

## 2. Cover letter

Write `letter.md` following the variant's letter structure, in the variant's language, and config (word range, language, salutation). Use the ad's exact job title. Pick two stories that answer the ad's top requirements. Name the main gap honestly when it is a must have.

Header: the contact line from profile.md, date and city, employer block (company legal name and address when known), subject line.

## 3. Facts check (required)

Before building, list every factual claim in `cv.md` and `letter.md` (numbers, verbs of ownership, tools, durations, scope, outcomes). Match each to a line in facts.md.

- No match, or the wording is stronger than the fact ("led" vs "contributed", "designed" vs "documented", "comfortable with" vs "open to"): rewrite to the fact or remove.
- Show the user only the claims that were changed or have no fact, as a short list, and ask before keeping any of them. When the user confirms a new fact, append it to facts.md; when the user corrects one, add the correction under "Things NOT to claim".

Also apply the external writing style rules from profile.md (for example no dashes), and check grammar and repeated words.

## 4. Build

Use the bundled builder unless the variant has its own `.docx` template (or config sets `own_template`). Pass the variant's format file first so its keys override the shared config:

```
NODE_PATH=$(npm root -g) node <this skill folder>/scripts/build-doc.js \
  --config <workspace>/_profile/templates/cv/<variant>.format.md \
  --config <workspace>/_profile/config.md cv.md <Name>-CV-<Company>.docx
NODE_PATH=$(npm root -g) node <this skill folder>/scripts/build-doc.js \
  --config <workspace>/_profile/templates/cv/<variant>.format.md \
  --config <workspace>/_profile/config.md letter.md <Name>-Cover-Letter-<Company>.docx
```

The builder reads page size, margins, font, size and accent color from config.md. Input format: `references/markdown-format.md`. Several .md inputs go into one document, each on a new page (for forms that want one combined file).

When the variant has a `.docx` template (or `own_template` is set), read the docx skill and fill that template instead. Skip a `--config` file that does not exist.

Convert to PDF when config lists pdf: `soffice --headless --convert-to pdf <file>.docx` (or the docx skill's soffice wrapper). Then count pages (`python3 -c "import pypdf,sys;print(len(pypdf.PdfReader(sys.argv[1]).pages))" file.pdf`).

Over the page limit: trim content first (weakest bullets, older roles), then tighten spacing within config bounds. Never shrink the font below config. Rebuild and recount.

## 5. Plain text variants

When a form takes text instead of a file, produce the letter as plain text under the limit the form states (or config `char_limits`): no header block, keep salutation and sign off, count characters with `wc -m`, and give the count.

## 6. Deliver

Write the files to the role folder (through the device bridge when the workspace is on the user's computer). With `storage: notion`, put the `cv.md` and `letter.md` text in the row's CV and Letter toggles and upload the built files as attachments to the row. Update the role's pipeline row: next step "ready to apply". Tell the user the file names and any claims that changed; do not paste the full letter unless asked.
