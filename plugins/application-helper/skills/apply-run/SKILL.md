---
name: apply-run
description: This skill walks the user through submitting applications one role at a time, with or without browser access. Use when the user says "let's go through the applications", "open them one by one", "give me the next one", "what do I need for this form", "prefill the form", "fill what you can but don't send", or "done" during an application session.
---

# Apply run

Take each queued role to submission: give the user the link and only the data they need, optionally drive the form in the browser, and record the outcome. The user always attaches files and submits.

## Before starting

Locate the workspace first (local folder or Notion; see `../setup/references/storage-notion.md`, Finding the workspace); with `storage: notion`, the paths below map to Notion pages and the Pipeline database. Read the role's **Process** line in `ad.md` first: for employer sites the application often goes through an account on another site (Inspira, EPSO, Interamt, USAJOBS), which the user signs in to; never create the account. Read `_profile/profile.md`, `_profile/config.md`, `_profile/ats-notes.md` (if present), `pipeline.md`, and the to-apply roles that have built files. Order by score unless the user gives an order.

Pick the mode from config `apply_mode`, or from what the user says; ask once only if neither settles it:

| Mode | Needs | Claude does |
|---|---|---|
| **link** (default) | nothing | Gives the link and the role specific data; the user opens and fills the form |
| **guide** | a browser tool the user allows | Opens the page, reads the actual fields, gives answers per field |
| **prefill** | a browser tool the user allows | Fills every field it can, the user reviews, attaches files and submits |

Never assume browser access. Use a browser only when the user has granted it in this session and chose guide or prefill. The user can switch modes at any time.

## What to include (all modes)

The user knows their own details. Leave out anything that is the same on every application:

- **Leave out by default:** name, email, phone, address, LinkedIn and portfolio links, date of birth, permit status, pronouns, demographic answers.
- **Personal data setting** (`personal_data` in config): `omit` (default) leaves them out; `ask` asks once per session whether to include them; `include` lists them. If unset, ask once at the start of the first run and save the answer.
- **Always include, per role:**
  - the link to the application (direct form URL when known, otherwise the ad)
  - files to attach, by file name and role folder
  - the answers that change per role: salary figure for this role (from config salary rules and the posted band), start date only if it differs from the usual, source board, location choice when the form offers several, work mode or relocation questions specific to this role
  - ready to paste free text: motivation or "why us", plain text letter under the stated limit, screening answers (years per skill, specific skill, tool, license or certification yes/no) worded honestly from facts.md
  - risky or judgment questions flagged with a recommendation (for example "Node.js experience: required, you have task level; answer Yes only if the options are yes/no")
- **Do not repeat** across roles what was already given in this session unless it changed (for example the salary rule explanation). One compact message per role.

## Link mode

1. Recheck the role is open when a fetch works (WebFetch on the ad). If the board blocks fetching, say so in one line and continue; the user reports if it is closed.
2. Predict the form from the board or applicant system (see `references/ats-playbooks.md`): which files it takes, whether it has a cover letter field or a text box with a limit, typical questions. Prepare those answers.
3. Send the message: link, files, role specific answers, free text blocks, flagged questions. End with "paste any question I did not cover".
4. When the user pastes form questions or a screenshot, answer exactly those.

## Guide and prefill modes

1. Load the browser tools in one call and read that browser's skill first. Open the ad in the session's tab group and recheck it is open. If closed: tell the user in one line, move it to Closed with reason "position closed" via tracker-sync, go to the next role.
2. Reach the form. On LinkedIn, refs go stale after re-render: click right after `find`, or click via JavaScript, then list tabs, because external forms open in a new tab. When the form opens outside the tab group (for example amazon.jobs), fall back to link mode for that role.
3. Detect the applicant system and follow its playbook. Read every field and the required ones.
4. **Guide:** send the same message as link mode, but matched to the real fields.
   **Prefill:** fill with click plus type (form_input often does not stick on React forms), handle dropdowns per playbook, verify with a screenshot and a required field check. Personal fields may be filled from profile.md; that is filling, not repeating them in chat. Report only what is left for the user.
5. Never click submit, tick consent or terms boxes, accept cookies beyond rejecting non-essential ones, enter passwords, or sign in. File uploads are for the user.

## After each role

Wait for "done" (or "skip", "closed"). Record in the role's `log.md` the date, mode, channel, salary answered and notable answers; move the role via tracker-sync. If a form needs material that does not exist (a letter of N characters, a missing letter, an unusual question), produce it with tailor-application's rules, then continue.

## Learning

When an applicant system behaves in a way the playbook does not cover, add one line to `_profile/ats-notes.md`.

## End of run

One line per role (applied, skipped, closed), then offer tracker-sync's summary.
