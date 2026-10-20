# claude-skills

Claude plugins by ahjav, published as a plugin marketplace.

## Plugins

| Plugin | What it does |
|---|---|
| [application-helper](plugins/application-helper) | Run a job search end to end, in any field: search job portals and employer career sites, score ads against your profile, tailor CVs and cover letters from verified facts, walk through applications, and track everything locally or in Notion. |

## Install

Claude Code (2.1.275 or later):

```
/plugin install application-helper --marketplace ahjav/claude-skills
```

Or add the marketplace first:

```
/plugin marketplace add ahjav/claude-skills
/plugin install application-helper@ahjav-skills
```

## Repository layout

```
.claude-plugin/marketplace.json   marketplace manifest
plugins/<plugin>/                 one folder per plugin
```

## License

MIT, see [LICENSE](LICENSE).
