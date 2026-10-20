---
name: tracker-sync
description: This skill keeps the job pipeline, role folders and the user's tracker in sync and reports progress. Use when the user says "update the tracker", "update Notion", "mark X as applied", "X rejected me", "this position is closed", "cancel X", "move X to interviewing", "what's my pipeline", "show my pipeline", "show the CV/letter for X", "sync from Notion", "summary of this week", "what deadlines are coming up", when the deadline digest scheduled task runs, or after apply-run or job-intake finish.
---

# Tracker sync

Locate the workspace first (local folder or Notion; see `../setup/references/storage-notion.md`, Finding the workspace); with `storage: notion`, the paths below map to Notion pages and the Pipeline database. With `storage: notion`, a stage move is a change of the row's Stage property plus a Log line; there are no folders or mirror to sync, and "show" requests get the row's link and the relevant section read back in short form.

Otherwise keep three things consistent: the stage in `pipeline.md`, the folder a role lives in, and the external tracker set in config.

## Stages

To apply → Applied → Interviewing → Offer → Closed.
Closed always carries a reason: rejected, position closed, skipped, withdrawn, declined, accepted.

Folder per stage depends on `folder_mode`:

| Stage | simple | stages |
|---|---|---|
| To apply | 1-to-apply | 1-to-apply |
| Applied | 2-active | 2-applied |
| Interviewing | 2-active | 3-interviewing |
| Offer | 2-active | 4-offer |
| Closed | 3-archive | 5-closed |

## Moving a role

1. Find the role by company, role words or folder number. If several match, list them and ask.
2. Update its `pipeline.md` row: stage, reason or next step, Applied date when moving to Applied, Updated date.
3. Move the folder when the stage's folder differs. On the user's computer use the device shell or bridge; never delete, only move. Keep the folder name.
4. Append a dated line to the role's `log.md` (what changed and why).
5. Sync the external tracker (below).

Batch moves are fine ("mark today's 9 as applied"): show the list before moving more than five roles.

## External tracker

Read `config.md` tracker settings. Fetch the schema before writing.

- **Find** the existing entry by link first, then company plus role. Earlier applications to the same company are separate entries; never overwrite them.
- **Create** missing entries for roles in the pipeline, using `field_map` and `stage_values`. Fill descriptive fields from `ad.md` (requirements, fits, gaps, salary band, process).
- **Update** stage and a dated note in the process or notes field ("16 Oct 2026: applied via Greenhouse with PDF CV and letter").
- Leave rows the plugin did not create alone, including empty rows; mention them to the user.
- Markdown only: `pipeline.md` is the tracker.
- With an external tracker, the workspace files are the source of truth. On "sync from Notion" (or the configured tool), read the tracker, list differences against `pipeline.md`, and apply the ones the user confirms.

## Showing files

When the user asks to see the pipeline, a role, an ad, a CV or a letter ("show my pipeline", "open the letter for X", "what did I send to Y"):

- Workspace in the session: send the file with SendUserFile, `display: render`, so the markdown shows formatted in the chat. Several files of one role go in one call.
- Workspace on the user's computer: read the file through the device tools and send a copy the same way. Say it is a copy: edits belong in the original, which the user can open in their own editor; Claude reads the latest version next time.
- For a filtered view ("only interviewing", "deadlines this week"), answer with a short table in the reply instead of a file.
- Offer once, not every time, to publish the pipeline as a private page (an artifact) for viewing on the phone; it is a snapshot and is republished on request.

Always read the file fresh before showing or editing it; the user may have tuned a CV or letter by hand.

## Summary

On request or at the end of a session, report from `pipeline.md`:

- Counts per stage, applications sent today and this week (against a weekly goal if profile.md sets one).
- Deadlines: To apply roles with a Deadline in the next 3 days, soonest first; deadlines already passed (offer to archive as "position closed").
- Interviews coming up, from the roles' `log.md`.
- Roles waiting for a reply longer than 14 days: suggest a follow up.
- Closed this period with reasons, and any pattern (for example several "position closed" means intake should be faster).

Keep it to a short table and two or three lines.

## Deadline digest (scheduled)

When run by the digest scheduled task, nobody is watching: produce only the deadlines, interviews and follow ups lines above, write them to `searches/digest-<yyyy-mm-dd>.md`, change nothing in the pipeline, and end with a short message. Say nothing when all three lists are empty.

When a role is moved to Applied or Closed and `deadline_reminders: per_deadline`, delete that role's pending reminder task (its name is in `log.md`).
