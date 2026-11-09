# Browser extension output

The plugin's Chrome extension (`extension/`, see its README) reads ads and result lists in the user's own browser and writes them to the workspace. It costs no usage, so prefer it over Claude reading portals in the browser.

## Files

| File | Holds |
|---|---|
| `feeds/browser-<yyyy-mm-dd>.json` | `postings` saved that day; `runs`: one entry per save (page URL, kind `list`, `ad` or `read-ads`, counts) |
| `_profile/portals/<host>.json` | list profile for one site |
| `_profile/portals/_pending/<host>.json` | a page captured for Claude to map: `url`, `probe`, the extension's `guess` |

Postings use the feed script's format plus:

- `source: "browser"`, `portal` (the site's host), `kind`: `ad` (full ad with `description` and `signals`) or `listing` (from a results page: no description, `postedText`, `postedDaysAgo`, `lines` = the card's text lines).
- `needsBrowser: true` with a `note` when a background read found no `JobPosting` data: read that ad with the browser (get_page_text once) or WebFetch.
- `signals`: `adLanguage` (`de`, `en` or absent), `languages` (per language: `level` a1 to c2, `native` or `unspecified`; `required`; `evidence` sentence), `minYears`. Rules in `matching.md`.

## Mapping a pending capture ("map the pending portal")

For each file in `_profile/portals/_pending/`:

1. Read `probe.candidates`: each has a `card` selector, a `count`, and `samples` (two cards, each a list of parts: `sel`, `text`, and `href` or `datetime` when present). The first candidate is usually the result list; pick the one whose samples look like job results.
2. Write the profile:

```json
{
  "host": "www.stepstone.de",
  "match": ["https://www.stepstone.de/jobs/", "https://www.stepstone.de/work/"],
  "card": "article[data-at=\"job-item\"]",
  "fields": {
    "title": "a[data-at=\"job-item-title\"]",
    "link": "a[data-at=\"job-item-title\"]@href",
    "company": "span[data-at=\"job-item-company-name\"]",
    "location": "span[data-at=\"job-item-location\"]",
    "date": "time@datetime || time",
    "salary": ""
  },
  "by": "claude",
  "learnedAt": "<now>"
}
```

   Field syntax: `css` reads the element's text, `css@attr` an attribute, `@attr` an attribute of the card itself, `a || b` tries each in order, empty means not shown on this site. Selectors run inside the card; `:scope > …` paths from the probe are fine. Prefer stable attributes (`data-*`, `itemprop`, ids without numbers) over generated class names (`css-1x2y3z`, `sc-abc123`). The title is the job title, never the company; when a card's main link has hidden text, take the heading.
3. Check it against the second sample: each field must pick the right part there too.
4. Save it as `_profile/portals/<host>.json`, move the capture out of `_pending/` (rename it to `<host>.done.json` in place if deleting is not allowed), and tell the user to reload the page; the side panel then shows the new extraction.

When a profile breaks, the extension guesses a new one and logs it; the user captures again and the same steps apply. Keep the old profile's `match` patterns.
