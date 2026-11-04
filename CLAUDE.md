# Nếp Nhà (nepnhaxudong)

A website for the family's yellow-flower sticky rice (gạo nếp cái hoa vàng) in Hải Dương. Design:
`docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`. Plans, one per part: `docs/superpowers/plans/`.

## Start and end of every session
- At the start of a session: run `git pull`. Read `docs/session/STATE.md` (the SessionStart hook already loads it).
- At the end of a session, before you stop: update `docs/session/STATE.md`, create or finish the session log file
  (see the section "Session feedback log"), then commit and push.
- Write big decisions in `docs/decisions/NNNN-<ten>.md`.
- Two machines must not work on the same branch at the same time. One branch per task: `feat/<ten-ngan>`, with a PR into `main`.

## Session feedback log (keep it after context compaction)
- **File:** one file per session: `docs/session/log/YYYY-MM-DD-<may>-<chu-de>.md`, based on the template
  `docs/session/log/_template.md`. Create the file when the owner gives the first feedback.
- **What to record:** corrections ("not X, do Y"), decisions by the owner, approaches the owner confirmed,
  constraints and preferences, facts the owner stated that are not in the code, and open items the owner asked for.
  Do not record what is already in the code or git, tool output, or the agent's own reasoning.
- **When:** in the same turn in which the owner gives the feedback, before you continue the task. Do not wait until the end of the session.
- **Format:** short bullets, newest at the bottom. When the owner changes their mind, edit or remove the old bullet.
  Never keep two bullets that contradict each other.
- **After context compaction or when you resume a session:** read this log file before any other step and follow it.
  If it contradicts the summary of the context, this log file wins.
- **Feedback that also applies to later sessions:** also write it in `CLAUDE.md` (rules) or in `docs/decisions/`
  (decisions). These are the durable place that every machine and every cloud session can read. Claude's memory exists on one machine only.

## Reply and language rules
- Reply to the owner in Vietnamese.
- Write files that instruct Claude in English: `CLAUDE.md`, `.claude/**` (skills, hooks, agents, settings), and hook messages. Documents for the owner in `docs/` (spec, plans, setup, `STATE.md`, session logs, decisions) stay in Vietnamese.
- When you write English: short sentences, simple words, no idioms, no figurative language.
- Independent assessment: when the question already contains a conclusion, assess it as if the question were neutral. Give the reasons for and against
  before the conclusion. If your conclusion is different, say so in the first sentence. Change your mind only when there is new information or a new argument.
- Link files with the full path from the root folder of the repo. Do not shorten a path with `.../`.

## Git and safety rules
- Git identity of this repo: `ledat1011` / `75622784+ledat1011@users.noreply.github.com`. Do not use a company email.
- Do not add a `Co-Authored-By` line to commits.
- Do not run `git reset --hard`, `git checkout -f`, or `git clean` when there are uncommitted changes.
- Do not write secrets (API keys, passwords, tokens) into the repo. Read keys from environment variables.
- Do not put content, names, URLs, or code from the owner's workplace into the repo.
- The design and the plans (`docs/superpowers/`) are committed to the repo.

## Front-end work (UI, copy, motion)
- Design direction is fixed: `brand/README.md` (colors, fonts, logo, mascot) and sections 2 and 3 of the spec.
  Treat them as this project's `DESIGN.md`. Do not invent a new palette, font pair or layout style.
- Then use the `antislop` skills as the filter for UI, copy and front-end code (`antislop`, `antislop-ui`,
  `antislop-layoutmobile`, `antislop-human`, `antislop-copywriting`, `antislop-code`).
- `taste-skill`: use its critique, its browser inspector (`inspect.mjs`, and `--app` for admin screens) and its
  look-and-fix loop. Do not use `draw.mjs` to pick a new direction, because the brand is already decided.
- GSAP code (part B4 and later): follow the `gsap-*` skills.
- Review UI code against the pinned rules with the `web-interface-guidelines` skill.
- Sources, commits and licenses of these skills: `.claude/skills/THIRD_PARTY.md`.

## Tools
- Test the tools: `npm run test:tools`.
- Scan a skill before you copy it into `.claude/skills/`: `node scripts/scan-skill.mjs <thu-muc-skill>`.
