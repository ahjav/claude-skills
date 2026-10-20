# Markdown format for the builder

## CV (a file with at least one "## " section)

```
# Full Name

email | phone | City, Country | linkedin.com/in/handle

## Summary

One paragraph.

## Experience

### Company | Role | Start - End

- Bullet with **bold** where useful.

## Skills

Plain comma separated line.
```

- `# ` name, then the contact line split by `|` (LinkedIn and http links become hyperlinks).
- `## ` section header with a rule under it.
- `### Title | Subtitle | Dates` entry line; dates align right.
- `- ` bullet; other lines are paragraphs. `**bold**` inline.

## Letter (a file with no "## " sections)

```
# Full Name

email | phone | City, Country | linkedin.com/in/handle

City, DD Month YYYY

Company
Street
Postcode City

**Application: Exact Job Title**

Dear ... ,

Paragraph.

Kind regards,
Full Name
```

Blocks are separated by blank lines; consecutive lines stay in one block, one per line. The header gets a rule under the contact line.
