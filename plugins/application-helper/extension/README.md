# Application Helper extension

A Chrome extension that reads job ads and search result lists in your own browser and saves them to your Application Helper workspace. Nothing it does uses Claude, so reading 30 listings costs no usage. Claude only scores what it saved.

## What it does

- **Job ad pages:** reads the structured `JobPosting` data most job pages embed for search engines (StepStone, Indeed, Greenhouse, Personio, LinkedIn's public pages and many company sites). It gets title, company, location, dates, salary, employment type and the full description, plus signals: the language the ad is written in, the language levels it asks for, and the minimum years.
- **Search result pages:** finds the repeated result cards and reads every one (title, company, location, date, link) using a **list profile** for that site. The first visit guesses a profile; you can keep it, or capture the page so Claude maps it properly. When a site changes its layout and the profile stops working, the extension guesses again and tells you.
- **Read ads in the background:** for listings whose title matches your saved search terms, it fetches each ad page with your browser session and reads its `JobPosting` data, one every 1.5 to 2.5 seconds, 30 per batch by default. Ads without that data are marked for a browser read. LinkedIn is off by default: automated reading is against LinkedIn's terms and can get the account restricted.
- **Saves to your workspace:** `feeds/browser-<date>.json`, in the same posting format as the feed script, which job-search reads. List profiles live in `_profile/portals/<site>.json`; captures waiting for Claude in `_profile/portals/_pending/`.

It never submits anything, and only reads a site after you allow it for that site.

## Install

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** and pick this `extension` folder. If you installed the plugin, setup can copy it to `_profile/tools/extension` for a fixed path.
3. Click the toolbar icon to open the side panel, then **Connect workspace** and pick your workspace folder (the one with `_profile/config.md`). After a Chrome restart, click **Allow access** once.

## Use

- On a search results page: check the count and first titles, then **Save listings** or **Save and read N ads**. If titles, companies or dates look wrong, click **Ask Claude to map this page**, then tell Claude "map the pending portal" and reload the page.
- On a job ad: **Save ad**.
- Then run a job search in Claude as usual; it picks up the saved file.

## Tests

`node --test extension/test/*.test.mjs` (from the plugin folder). The page and end-to-end tests need Playwright with Chromium; they run the extension against fixture pages shaped like StepStone, LinkedIn and Indeed results. Real sites differ, so the first visit to each real portal is the real test.
