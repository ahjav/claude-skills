# Application helper config

## Workspace
storage: local             # local | notion | other (see setup references/storage-notion.md)
notion_base:               # base page URL when storage is notion
folder_mode: simple        # simple = 1-to-apply, 2-active, 3-archive; stages = one folder per stage
numbering: true            # prefix role folders with a running number

## Filtering
experience_filter: stretch # exact | stretch | long_stretch (see job-search)
filter_requirements: no    # yes = same level applies to must-have skills, tools, certifications, specializations

## Portals
# one block per portal; access: fetch | browser | api (job-search corrects it on first use)
# - name: LinkedIn
#   access: browser
#   url_template: https://www.linkedin.com/jobs/search/?keywords={q}&location={loc}&f_TPR=r604800
portals:

## Employer sites
# employers that post only on their own site (UN, EU, government, universities, companies)
# - name: UN Careers
#   url: https://careers.un.org/jobopening?language=en
#   search_url_template:   # empty = open url and search or list on the page
#   access: browser
#   sector: un             # un | intl | eu | gov-de | gov-fr | gov-us | gov-uk | academic | ngo | company
#   apply_via: Inspira account
#   terms:                 # extra title words that work on this site, learned by job-search
employer_sites:

## Searches
saved_searches:            # one per line: terms | location | work mode, e.g. staff nurse | Berlin | on-site
exclude_terms:             # titles containing these are dropped, e.g. working student, intern
watch_companies:           # older list of career page URLs; still searched, prefer employer_sites
max_results_per_query: 30
last_run:                  # set by job-search, per portal: <portal>: <timestamp>

## Templates
variants:                  # e.g. eu-en, us-en, fr-fr; files in _profile/templates/cv|letter/<variant>.md
default_variant: eu-en
variant_rules:             # e.g. ad in French -> fr-fr; US location or US company -> us-en; else default

## CV
# shared defaults; a variant's templates/cv/<variant>.format.md overrides these keys
formats: docx, pdf
page_size: A4              # A4 or Letter
max_pages: 1
font: Calibri
font_size_pt: 10
margins_cm: top 1.2, bottom 1.1, left 1.75, right 1.75
accent_color: 1F3A5F
section_order: Summary, Experience, Education, Certifications, Skills, Languages
photo: no
date_of_birth: no
own_template:              # set per variant by placing templates/cv/<variant>.docx; empty = bundled builder

## Cover letter
formats: docx, pdf
max_pages: 1
words: 250-400
structure: letter-template.md
header: name and contact, then date, then employer block
employer_address: yes when known
language: English          # or: match the ad
salutation_fallback: Dear <Company> Hiring Team,

## Plain text variants
char_limits: 4000, 1000

## File names
cv_name: <First>-<Last>-CV-<Company>
letter_name: <First>-<Last>-Cover-Letter-<Company>

## Apply run
apply_mode: link           # link (no browser) | guide | prefill
personal_data:             # omit | ask | include  (empty = ask once, then save)

## Scoring
apply_threshold: 70        # at or above: tailor and queue
maybe_threshold: 60        # between: queue as maybe; below: archive as skipped

## Tracker
type: markdown             # markdown | notion | sheets | other | notion-native (storage is notion)
location:                  # database / sheet URL or id
stage_values:              # tracker value per stage, e.g. To apply = "1. Not started"
field_map:                 # pipeline field -> tracker column

## Schedules
# scheduled tasks created during setup: name, id, cadence
search_primary:            # name, id, time, runs in cloud | computer
search_check:              # primary + 1h; runs pending search, sends digest
search_fallback:           # around 13:00; runs search if still pending
digest_task:               # only when there is no check run
deadline_reminders: digest # digest | per_deadline | calendar | none
