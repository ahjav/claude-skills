# Scheduled runs

Scheduled searches run as a chain of up to three tasks per day, because neither place a task can run covers everything on its own:

- A task that **needs the user's computer** can use the Claude app's browser (all portals) but runs only if the computer is on with the Claude desktop app open.
- A **cloud** task always runs but has no browser, so it covers only portals and sites with access `fetch` or `api`. It can only store results if the workspace is reachable from the cloud (`storage: notion` or another connected store); a fresh cloud session cannot see the user's local folder or another session's files.

## The chain

| Task | Default time | Does |
|---|---|---|
| primary | weekdays 8:00 or 9:00 (user's choice) | Runs the search |
| check | primary + 1 hour | If today's run is complete: sends the digest. If partial or missing: runs what is pending, then sends the digest |
| fallback | around 13:00, at least 1 hour after check | If today's run is complete and the digest went out: ends silently. Otherwise runs what is pending and sends the digest |

Times follow the scheduler's minute guidance (moved a few minutes off the hour); keep the three in order. If primary is after 11:00, fallback is check + 2 hours.

Where each task runs, by storage:

| Storage | primary | check | fallback |
|---|---|---|---|
| Folder on the user's computer | needs computer | needs computer | needs computer |
| Notion or another connected store | cloud (fetch and api portals) | needs computer (browser portals, digest) | needs computer |
| Session workspace only | scheduled searches not possible: files do not carry over between sessions; offer a computer folder or Notion instead |

With computer-only tasks, a day with the computer off produces nothing, and nothing is lost: the next run's search window starts at each portal's last successful run.

## Run record

Every scheduled run starts by reading today's run record and ends by updating it, so the three tasks never repeat or skip work:

- Local: `searches/<yyyy-mm-dd>-run.md`, first lines `status:`, `started:`, `portals_done:`, `portals_pending:`, `digest_sent:`.
- Notion: today's row in the Search runs database (see setup's storage reference).

Steps for any role:

1. Read the record. If `status: running` and `started` is less than 40 minutes ago, another run is in progress: end without a message. If older, the earlier run stopped midway: continue from `portals_pending`.
2. List the portals and employer sites still pending today. Run those this environment can reach (browser ones only where the browser is reachable). Mark each done as it finishes; leave the rest pending with the reason (no browser, sign in needed, site down).
3. Search window per portal: from that portal's `last_run` in config (fallback 24 hours, at most 7 days) to now. Update `last_run` per portal when it completes.
4. Set `status: complete` when nothing is pending, otherwise `partial`.
5. Digest (check and fallback roles, or primary in the cloud when no computer task exists): counts per verdict, the new Apply roles, portals still pending and why, plus deadlines in the next 3 days and follow ups due, from the pipeline. Set `digest_sent: yes`. This replaces a separate deadline digest task.
6. End with one short message only when something was run or the digest is new; a fallback finding everything done ends silently.

## Task prompts

Each prompt is self-contained, since every scheduled run starts fresh:

- primary: "Run the application-helper job-search skill unattended, role primary, workspace <folder path or Notion base page URL>."
- check: "Run the application-helper job-search skill unattended, role check, workspace <...>."
- fallback: "Run the application-helper job-search skill unattended, role fallback, workspace <...>."
