---
name: job-intake
description: This skill takes job ads in and scores them against the user's profile. Use when the user pastes job links, says "check these jobs", "evaluate these ads", "classify my tabs", "check my saved jobs on LinkedIn", "add these to my list", "is this a match", asks for a match score, or when job-search hands over a batch of postings.
---

# Job intake

Turn job links from any source into scored, filed roles in the pipeline.

## Before starting

Locate the workspace first (local folder or Notion; see `../setup/references/storage-notion.md`, Finding the workspace); with `storage: notion`, the paths below map to Notion pages and the Pipeline database. Read `_profile/profile.md`, `_profile/facts.md`, `_profile/config.md` and `pipeline.md`. If `_profile/` is missing, run the setup skill first.

## 1. Collect the ads

Sources: a batch from job-search (links or page text, with the query and portal that found each), pasted URLs, open browser tabs, saved jobs pages (LinkedIn jobs tracker, Indeed saved jobs, StepStone merkliste), or pasted text.

- Try WebFetch first. LinkedIn, Indeed and StepStone usually block it; then read it in the browser: prefer the built-in browser (the Claude app's own browser), fall back to Claude in Chrome when the user allows it. Read that browser's skill before its first use. Without browser access, ask the user to paste the ad text (or a screenshot) for the blocked links, in one message listing them. Never work around a block with curl or mirrors.
- For a saved jobs page, read the list first, then each ad.
- Dedupe against `pipeline.md` by link and by company plus title. For a company already in the pipeline or the user's tracker, note the earlier entry (date, role, outcome) in the new `ad.md`.

## 2. Check the role is open

For employer site roles, the organization's own page is the source of truth; record the closing date with its time zone as the deadline. Mark a role closed when the page says so ("no longer accepting applications", "expired", "nicht mehr verfügbar", a redirect to a search page, a 404). A role can still be listed and closed; apply-run rechecks at apply time. Closed roles go straight to the archive with reason "position closed" and get no tailoring.

## 3. Experience filter

Apply `experience_filter` (and `filter_requirements`) from config to the full ad text, with the rules in `../job-search/SKILL.md` (Experience filter levels). A role outside the range is not scored. From a job-search batch, return it to job-search for the run report and create no folder. From links the user pasted, archive it with reason "skipped: above filter level (<n> years asked)", since the user picked it on purpose. Count these separately in the output. The user can ask to see them or to rerun with a wider level.

## 4. Score (0 to 100)

Score against the profile, not against an ideal candidate:

| Weight | Criterion |
|---|---|
| 30 | Core skills, tools and domain match with facts.md (only confirmed skills count) |
| 20 | Level fit (years asked, title or grade, leadership expectations) |
| 15 | Hard constraints: language requirement, location and work mode, permit or sponsorship, required licenses or registrations, shift or schedule limits |
| 15 | Salary: posted band against minimum and target; unknown counts as neutral |
| 10 | Requirements the user cannot evidence (each named must have without a fact lowers this) |
| 10 | Preferences: office/remote preference, industry, company size |

Any broken hard constraint (for example C1 language required when the profile rules it out, or a professional license or registration the user does not hold: nursing registration, teaching qualification, driving license class, bar admission, security clearance) caps the score at 40, whatever the rest. For employer sites (UN, EU, government, academic), also check citizenship, required official languages and degree level as hard constraints, and read grades with the table in `../job-search/references/employer-sites.md`.

Verdict from config thresholds: Apply, Maybe, Skip.

## 5. File each role

With `storage: notion`, create a Pipeline database row instead, with the `ad.md` content as its page body; otherwise create `<to-apply folder>/<nn>-<company>-<short-role>/ad.md` for Apply and Maybe; create it under the archive with reason "skipped" for Skip. Use lowercase kebab case.

`ad.md` format:

```
# <Company>: <Title>, <score>
[Ad](<url>) · <location, work mode> · posted <when> · source <board> (query <terms> when from job-search)
**Deadline:** <apply-by date from the ad, or none stated>
**Verdict:** Apply | Maybe | Skip (<one line why>)
**Fits**
- requirement: matching fact
**Gaps / watch outs**
- gap: how to address or prepare
**Earlier contact:** <previous applications to this company, if any>
**Ad snapshot:** <key responsibilities and requirements, grade, salary band, language, process steps>
**Process:** <where to apply (ad page, Inspira, EPSO, Interamt...), reference number, required documents, tests>
```

Keep the snapshot: ads disappear, and interviews need it.

## 6. Update the pipeline

Add one row per role to `pipeline.md` (stage To apply or Closed), sorted by score within the batch, with the Deadline column filled when the ad states one.

Deadlines: follow `deadline_reminders` in config. `digest` needs nothing here. `per_deadline`: create a one-off scheduled task the day before (morning, user's time zone) naming the role and folder, and note its name in `log.md`. `calendar`: add an all-day event through the connected calendar. Ask before the first reminder of a session; after a yes, create the rest without asking.

Then hand off: offer tracker-sync for the external tracker and tailor-application for the Apply roles.

## Output to the user

A short table: company, role, score, verdict, deadline, one-line reason. Lead with the count per verdict and the count dropped by the filter level. No essay per role.
