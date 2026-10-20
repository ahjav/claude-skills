# Changelog

## 0.6.0
- Renamed from application-kit to Application Helper (`application-helper`). Existing workspaces keep working; Notion workspaces with the old marker are still found. Uninstall application-kit after installing application-helper.

## 0.5.0
- Scheduled searches run as a chain: main search, a check one hour later that runs it if missed and sends the digest, and a fallback around 13:00. A daily run record prevents repeated or skipped portals.
- Notion (or Google Drive) as full workspace storage: base page, Pipeline and Search runs databases.

## 0.4.0
- Field-agnostic: occupations, licenses and registrations, schedule limits, portals by field.

## 0.3.x
- Employer career sites (UN system, EU institutions, government, academic, any company), grade to experience mapping, sector hard constraints.
- Local files as the default tracker; show files in chat; sync back from Notion.

## 0.2.0
- New job-search skill: portals, saved searches, browser fallback, experience filter, validation through job-intake.
- Setup: filter level, transparent folder structure, several CV and letter variants, Claude Project option, schedules and reminders, post-setup walkthrough.

## 0.1.x
- Initial skills: setup, job-intake, tailor-application, apply-run, tracker-sync.
