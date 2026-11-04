# Third-party skills and plugins

## Copied into this folder

| Folder | Source | Commit | License | Changes |
|---|---|---|---|---|
| `web-interface-guidelines` | `rules.md` is `command.md` from https://github.com/vercel-labs/web-interface-guidelines | `434b7f91364665f2f733b310ec54809bf8f37937` | MIT | `SKILL.md` is written for this project. It replaces `skills/web-design-guidelines` of https://github.com/vercel-labs/agent-skills, which has no plugin, no license file, and fetches the rules from the internet on every run. |

To update it: download `command.md` again, read the changes, copy it to `rules.md`, and update the commit above.

## Plugins declared in `.claude/settings.json`

Each source was read and scanned with `node scripts/scan-skill.mjs` on 2026-11-04 before it was declared.

| Plugin | Marketplace source | Pinned to | License | Notes |
|---|---|---|---|---|
| `antislop` | https://github.com/miqdadbadjuber/anti-slop | tag `v3.2.25` | MIT | Six skills. Also starts the local MCP server `antislop-contrast` (a Python contrast checker; it needs Python 3). |
| `taste-skill` | https://github.com/leonxlnx/taste-skill | tag `v2.1.5` | MIT | One skill, `design-taste-frontend`. |
| `gsap-skills` | https://github.com/greensock/gsap-skills | branch `main` (no tags; read at `aed9cfd`) | MIT | Eight `gsap-*` skills. Updates arrive without review. |

To update a pinned plugin: read the changes of the new tag, scan them, then change `ref` in `.claude/settings.json`.
