# Nếp Nhà (nepnhaxudong)

A website for the family's yellow-flower sticky rice (gạo nếp cái hoa vàng) in Hải Dương. Design:
`docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`. Plans, one per part: `docs/superpowers/plans/`.

## Start and end of every session
- At the start of a session: run `git pull`. Read `docs/session/STATE.md` (the SessionStart hook already loads it).
- At the end of a session, before you stop: update `docs/session/STATE.md`, create or finish the session log file
  (see the section "Session feedback log"), then commit and push.
- Write big decisions in `docs/decisions/NNNN-<ten>.md`.
- Two machines must not work on the same branch at the same time. One branch per task: `feat/<ten-ngan>`, with a PR into `main`.
- When a branch's work is done, reviewed and its tests pass, push it and open the PR into `main` yourself. You do not need
  to ask the owner first (owner, 2026-11-04).
- Merge the PR yourself too, without asking, when all CI checks pass and there is no merge conflict (owner, 2026-11-05).
  The owner gives feedback on the running product or on your drafts along the way, not on each merge. Tell the owner
  what you merged, and keep the local preview up to date so the owner can look at it.

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
- The brand is fixed: `brand/README.md` (colors, fonts, logo, mascot) and sections 2 and 3 of the spec.
  Treat them as this project's `DESIGN.md`. Do not invent a new palette, font pair, logo or mascot.
  Layout and composition may change, through `taste-skill` (see below).
- The front-end skills come from plugins declared in `.claude/settings.json` (`antislop`, `taste-skill`,
  `gsap-skills`). If a skill below is missing, tell the owner to install the plugin. Do not install it yourself.
- Then use the `antislop` skills as the filter for UI, copy and front-end code (`antislop`, `antislop-ui`,
  `antislop-layoutmobile`, `antislop-human`, `antislop-copywriting`, `antislop-code`).
  - The owner chose antislop mode `during` (2026-11-04): apply the rules while you build, and run the antislop
    Delivery Gate (PASS/FAIL report with evidence) before you deliver any UI work or open a PR with UI changes.
  - Dials, inferred from the spec: public site `ENERGY 2 / RHYTHM 2 / MOTION 2` (warm family brand, mascot
    and scroll motion); admin `ENERGY 1 / RHYTHM 1 / MOTION 1` (a tool for family members on a phone).
- `taste-skill` (skill name `design-taste-frontend`): use its critique, its browser inspector (`inspect.mjs`, and `--app` for admin screens) and its
  look-and-fix loop. You may use `draw.mjs` to deal a layout and composition direction (owner, 2026-11-04,
  decision `docs/decisions/0009-taste-bo-cuc.md`). Always pass `--keep palette,type`, so the brand colors and
  fonts stay. Show the owner the dealt options (`--options 3`) and let the owner choose before you build one.
- GSAP code (part B4 and later): follow the `gsap-*` skills.
- Review UI code against the pinned rules with the `web-interface-guidelines` skill (in `.claude/skills/`).
- Sources and licenses: `.claude/skills/THIRD_PARTY.md`. Why plugins: `docs/decisions/0006-skill-frontend.md`.

## Running tests (owner, 2026-11-05)
- While you build or fix: run only the tests related to what you changed. In `web/`: `npx vitest run --related <changed files>`
  (or the test files you touched). In `api/`: only the test classes of the changed area. Do not run the whole suite
  after every small fix.
- After you merge two branches together (or `main` into a branch with conflicts): run the full `npm test`, `npm run typecheck`
  and `npm run lint` once. Leave the full-stack e2e to CI. Check the exit code, not only the pass count.
- Before you merge a PR: if that full run did not happen on the final code, wait for CI to pass.

## Tools
- Test the tools: `npm run test:tools`.
- Scan a skill before you copy it into `.claude/skills/`: `node scripts/scan-skill.mjs <thu-muc-skill>`.
