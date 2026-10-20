# Applicant tracking system playbooks

Field behavior learned from real runs. Prefer click then type over form_input on React forms.

## Greenhouse (job-boards.greenhouse.io, job-boards.eu.greenhouse.io)
- Text fields: click the field, type. form_input values may not stick.
- Country and phone: country is a searchable dropdown; type the country, press Enter; then type the national number without the country code.
- Location (City): type the city, wait 1 to 2 s, click the matching suggestion.
- Select questions are react-select comboboxes: click, type a filter ("LinkedIn Job", "No", "Yes"), press Enter. Check the chosen value afterwards; similar options exist ("LinkedIn Job Search" vs "LinkedIn Job Post").
- Demographic questions are often required; leave them for the user.
- Resume and cover letter: Attach buttons; upload is for the user.
- Confirmation page title: "Thank you for applying".

## Lever (jobs.lever.co)
- The posting page links to /apply; navigate there directly.
- Simple HTML inputs; "Current company" optional; work authorization is a select; cover letter goes under "Upload further files".

## Ashby (jobs.ashbyhq.com)
- Single page; yes/no questions are buttons; free text questions are common (motivation, compensation with equity).
- Often only one file field (resume); the cover letter can be skipped or attached in place if the user wants.

## Pinpoint (careers.<company>.com/postings/.../applications/new)
- Required fields include address line 1 and postcode; date of birth usually optional.
- Country is a native select (form_input works). Radios: click the option.
- Usually no cover letter field: put a condensed letter in "Personal Summary".
- Cookie banner: click "Reject all".
- Find empty required fields with JavaScript: inputs, selects and textareas with the required attribute and no value or unchecked group.

## LinkedIn Easy Apply
- Opens a modal on the job page; contact data comes from the LinkedIn profile (email may show without dots, same Gmail inbox).
- Multi step with Next; asks for years per skill and yes/no screening questions. Upload a fresh resume rather than an old stored one.
- After an external apply, LinkedIn asks "Did you finish applying?"; the user answers.

## LinkedIn external apply
- "Apply on company website" opens a new tab; refs go stale quickly, so click via JavaScript if needed and re-list tabs.

## Indeed (de.indeed.com and others)
- "Schnellbewerbung" / quick apply requires an Indeed sign in by the user.
- Cover letter is often a text box with a character limit (commonly 4000).

## Amazon (amazon.jobs)
- Opens outside the tab group and requires sign in; give answers only.
