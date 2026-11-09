# Matching before scoring

Every ad dropped here is an ad job-intake does not read. Run these rules on every candidate, from any source, before handing the batch to job-intake. Count each drop by rule for the report, and keep the dropped list there so the user can override.

## 1. Hard pre-filters

| Rule | Uses | Drop when |
|---|---|---|
| Duplicate | link, company + title, `pipeline.md` | already in this batch or the pipeline (any stage; note re-posts of rejected roles instead of dropping silently) |
| Excluded title | `exclude_terms` | title contains an excluded term |
| Title relevance | `saved_searches` | listings only (no description): the title lacks every distinctive word of every term (role nouns and levels like engineer, developer, Entwickler, senior do not count). Ads with a description: every word of a term in title or description, one in the title |
| Location | search location, profile.md | the ad names only places outside the search area, and is not remote within an area that includes it (remote limited to another country is outside) |
| Language | `signals.languages`, profile.md **Language limits** | a `required` level above the user's limit (for example C1 required, limit B1). Optional (`required: false`) and `unspecified` levels never drop; job-intake reads them |
| Experience | `signals.minYears`, `experience_filter` | minimum years outside the configured range (see job-search, Experience filter levels) |
| Recency | `postedAt` or `postedDaysAgo` | older than the run's window |
| Closed | `validThrough` | date passed |

An ad written in a language the user speaks below working level (`signals.adLanguage`) is not dropped for that alone: many German-written ads accept B1. job-intake weighs it.

Signals come from the extension and the feed script. For an ad read any other way, apply the same rules to its text directly.

## 2. Learned rules

Read `_profile/feedback.md` (written by tracker-sync, below) before filtering and scoring:

- **Rules** the user stated ("skip consulting and agencies", "no pure frontend") are applied here as drops when they name a title or company pattern, and by job-intake as score adjustments otherwise. They never override a hard constraint in either direction.
- **Source and term results**: terms and sources with no Apply-verdict roles across their last 30 found postings are listed in the search report as candidates to drop or rewrite. Never change `saved_searches` without asking.

## 3. Feedback file

`_profile/feedback.md`, updated by tracker-sync whenever a role changes stage and by job-intake when the user overrides a verdict:

```
# Feedback

## Rules
- skip: agencies and consultancies placing contractors   (2026-11-09, user)
- prefer: product companies over agencies   (2026-11-09, user)

## Overrides
| Date | Role | Verdict | User did | Reason given |
|---|---|---|---|---|
| 2026-11-09 | Acme: Backend Engineer | Maybe 62 | applied | likes the domain |

## Outcomes by source and term
| Source | Term | Found | Apply verdict | Applied | Interview | Offer |
|---|---|---|---|---|---|---|
| feed: greenhouse/doctolib | backend engineer | 12 | 3 | 2 | 1 | 0 |
```

- Rules are only what the user said, with the date. An override without a stated reason stays in Overrides; three overrides pointing the same way (for example applying to Maybe roles at agencies) are worth one question to the user: "should this become a rule?"
- Outcomes come from `pipeline.md` stages plus the source and query recorded in each role's `ad.md`.
