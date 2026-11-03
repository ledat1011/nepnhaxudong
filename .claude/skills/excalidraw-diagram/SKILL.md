---
name: excalidraw-diagram
description: Use when the user asks for a diagram of any kind — architecture / component overview, flow or pipeline, sequence, state machine, timeline, before / after, or a kind with no name yet — or wants a diagram image for a PR or a docs page: "draw a diagram", "architecture diagram", "flow diagram", "sequence diagram", "timeline", "sketch", "excalidraw", "make a picture of this flow", in any language. Also use when the user asks to animate a diagram or flow into a GIF: "make a GIF of this flow", "animate the diagram", "flow gif", "icons moving along the arrows", for a demo or a chat post. Makes an editable Excalidraw file plus a PNG sized for a PR or a docs page, one colour per meaning (yellow = database, blue = message queue, orange = service); a GIF only when asked; saves into the project's docs/diagrams folder only on request. For a PR state machine in the strict straight-column / right-angle house style use state-diagram instead.
---

# Excalidraw diagram

Claude composes each diagram from a component kit; the kit, the lint and the renderer keep every diagram readable
and consistent. There are no templates per diagram kind — read the context and compose.

By default the result is the still diagram (`.excalidraw` + PNG). An animated GIF of it is made only when the user
asks for one (step 10); never offer it on your own.

`K` below is this skill's folder: `$CLAUDE_PROJECT_DIR/.claude/skills/excalidraw-diagram`.

```bash
node "$K/lib/build.js" <scratchpad>/<name>.diagram.js                          # draft: lint + PNG next to the script
node "$K/lib/build.js" <scratchpad>/<name>.diagram.js --out "<output folder>"   # only after the user said yes to saving
```

`build.js` prints the lint result (`ERROR` / `WARN` lines and a summary), the file paths and a markdown embed line,
and exits 1 while any ERROR remains.

Run the build with a tool timeout of at least 300000 ms: one render normally takes ~10 s, but its timeouts add up to
~4 minutes, and a build killed by the tool leaves a headless browser behind.
Write paths with forward slashes and no trailing slash (`--out "docs/diagrams/orders"`): in bash a trailing
backslash escapes the closing quote.

## Setup — where diagrams are saved

By default diagrams are saved in `docs/diagrams/<area>` of the current project. Nothing needs to be configured.
Only when the user wants another folder, copy `$K/config.example.json` to `$K/config.json` (git-ignored, one per
machine) and read it before the first diagram of a session:

| Key | Meaning |
|---|---|
| `notesRoot` | root folder to save diagrams into and to read facts from (default `docs/diagrams`) |
| `obsidian` | `true` → the notes are an Obsidian vault; give `![[<slug>.png]]` embed lines |
| `folders.ticket` / `incident` / `subsystem` / `other` | folder patterns under `notesRoot`; `{ticket}`, `{epic}`, `{slug}`, `{area}` are filled per diagram |

## Workflow

1. **Understand the question.** What must the diagram answer ("where does the message go?", "why does it get
   stuck?", "what is new in this PR?"), who reads it (reviewer, tester, the owner), where it goes (PR, issue,
   docs page). Ask only when one of these is missing and would change the diagram.
2. **Collect facts from real sources** — the project docs under `docs/` first, then the code. Never from memory.
   When the docs and the code disagree, follow the code and tell the user which doc is out of date. Every
   component has a source; no invented topic, table or class names. Not sure → use a generic name
   ("story-published topic") or leave it out.
3. **Pick the main story.** One main path, readable from start to end. Highlight the new part or the problem
   (`d.highlight`); everything else is secondary or removed.
   Same subject already drawn? If the target folder already has a `.diagram.js` / `.png` for this subject,
   start from that script and keep its slug, so the build updates it instead of adding a near-duplicate.
4. **Choose the layout** from `references/layout-patterns.md` by the shape of the content. Nothing fits → combine
   or create a pattern. Say the layout in one line ("Layout: snake, 2 rows + channel chain below") and continue;
   stop and ask only when the diagram is large or can be read two ways.
5. **Size budget.** ~20 components, ≤ ~2600 px wide, aspect ≤ 2:1. More → an overview diagram and a detail diagram
   (one script may return both). The request is a GIF from the start → also keep the GIF limits in
   `references/animation.md` (≤ ~12 components, every moving path a `d.link`).
6. **Style.** Hand-drawn by default. If the target is formal (a page for a client, an official document), ask
   the user once: hand-drawn or straight (`createDiagram({ style: 'clean' })`)? If you cannot ask (for example when
   running as a subagent), use hand-drawn and say so in your report.
7. **Write the script** in the scratchpad: `<subject>.diagram.js` exporting `kit => [{ slug, diagram }]`
   (`references/components.md`). Colours come from the meaning (`references/visual-language.md`) — never pick a
   colour for looks. Write the script with the file-writing tool, never through a shell heredoc, `echo` or `sed` —
   shell quoting turns `\n` inside JS strings into real line breaks.
8. **Build → read the lint → look at the PNG → fix**, at most 4 rounds:
   - fix every `ERROR` by moving elements in the script (never by changing the lint limits);
   - read each `WARN` and fix it unless there is a reason (say the reason);
   - open the PNG with the Read tool and check: main path readable without searching, no overlap the lint missed,
     colours match their meaning, colour key present, at most one highlight, smallest text readable.
   Still failing after 4 rounds → stop and tell the user exactly what is still wrong.
9. **Show, then ask before saving.** Show the PNG to the user (send the file if the session can send files) and give
   the scratchpad paths of the `.png` and `.excalidraw`. Then ask once: "Save it into the project docs
   (`<folder from the next section>`)?" Only on a yes, build once more with `--out` into that folder and give the new
   paths and, for an Obsidian vault, the embed line. On a no, or no answer, the files stay in the scratchpad.
   - The request already says where to save ("save it to the docs", "put it next to the X doc") → save without asking.
   - You cannot ask (for example when running as a subagent) → do not save; report the scratchpad paths.
   - The user asked for a GIF → do not ask here; do step 10 first and ask once for the PNG and the GIF together.
10. **GIF — only when the user asks for one.** Read `references/animation.md` and follow its steps: story as a
    list, `<slug>.anim.js` in the scratchpad next to `<slug>.png` and the `.diagram.js`, preview 3–4 moments,
    build, `verify.js` until every check is PASS, look at the contact sheet. Show the GIF, then ask once: "Save the
    PNG and the GIF into the project docs (`<folder>`)?" (same exceptions as step 9). On a yes, build the diagram
    with `--out` (it copies `<slug>.anim.js` too and prints its new path as `anim`), then run
    `node "$K/lib/gif/animate.js" <that .anim.js>` so the GIF lands next to the PNG. The build wrote `<slug>-v2`
    → the `.anim.js` was copied as `<slug>-v2.anim.js`; tell the user.

## Where it goes (when the user wants it saved)

Default: `docs/diagrams/<area>` in the project (create it if missing). With a `config.json`, use the first row that
matches; folder patterns come from `config.json` `folders`, under `notesRoot`.

| Diagram for | Folder |
|---|---|
| an issue or task that already has a folder in the docs | `folders.ticket` |
| an incident that has a doc | the folder of that doc (`folders.incident`) |
| a subsystem that has a doc | the folder of that doc (`folders.subsystem`) |
| nothing related | `folders.other` (default `docs/diagrams/<area>`) |

A pattern does not match the project's docs (the folder does not exist and nothing like it does) → save next to the
closest related doc, or in `docs/diagrams/<area>`, and tell the user which folder you used.

- `--out` also copies the `.diagram.js` (and a `<slug>.anim.js` next to it) into the folder, so the diagram and its GIF can be regenerated from there.
- Slugs are kebab-case `<subject>-<kind>`, e.g. `story-publish-overview`, `checkout-sequence`.
- `build.js` never overwrites a `.excalidraw` the user edited by hand; it writes `<slug>-v2`. Tell the user when that
  happened. "Edited" is judged by content against the snapshot of the last build (kept in `$K/.built`, per machine):
  opening the file in an editor (re-snapped arrows, re-measured text) or a drag of a few pixels is not an edit. A file
  with no snapshot (built on another machine or before snapshots existed) is judged by file times: newer than its
  PNG = edited. Only when the user says the edited file may be replaced, add `--overwrite`.
- Never edit the user's existing docs. Give the user the embed line (`![[<slug>.png]]` or a markdown image) to paste.

## Rules that are easy to forget

- The PNG is shown ~1600 px wide in a PR or a docs page; `ERROR text too small` means the layout is too wide —
  split or narrow it, never shrink the font.
- An arrow into the top of a server stack or queue stops above its name (the kit handles it). Use
  `queue({ labelBelow: true })` when the queue sits under the component that feeds it.
- More than one arrow kind in a diagram → say what they mean in a short note under the colour key
  (e.g. "dashed = data write · red = failure"), with `d.note`.
- Label arrows only at branches, conditions and entry points.
- One highlight per diagram.
- A new component or colour → propose it for the kit / palette; change the kit only after the user agrees.

## Requirements and offline use

- Node ≥ 22 (the renderer uses Node's built-in WebSocket).
- A Chromium-based browser: Edge, Chrome or Chromium, found in the usual install places on Windows, macOS and Linux.
  Elsewhere, set `EXCALIDRAW_BROWSER` to the browser's full path.
- Network access to esm.sh: `render.js` loads Excalidraw from there. Without it the build fails with
  "Is esm.sh reachable?". Tell the user; the fix (not done yet) is to vendor `@excalidraw/excalidraw@0.18.0` into the
  skill with npm and point `EXCALIDRAW_URL` in `lib/render.js` to the local copy.
- GIF only: npm packages (`package.json`; the PNG part loads none of them). Run `npm ci` in the skill folder once per
  machine (see `docs/setup.md`) (~34 MB; `@napi-rs/canvas` has a native file per platform, so `node_modules` cannot be copied between
  machines). Ask the user before running it. Making a GIF needs no network.

## Files

- `lib/kit.js` components · `lib/check.js` lint · `lib/render.js` PNG · `lib/save.js` names · `lib/build.js` all of it
  · `lib/measure.js` text width
- `lib/gif/animate.js` GIF + previews · `lib/gif/verify.js` GIF checks · `lib/gif/scene.js` reads the `.excalidraw`
  · `lib/gif/icons.js` moving icons · `lib/gif/packages.js` loads the npm packages
- `config.example.json` → copy to `config.json` (optional, per machine, git-ignored)
- `references/visual-language.md` · `references/layout-patterns.md` · `references/components.md`
  · `references/animation.md` (GIF only)
- `examples/*.diagram.js` with their PNGs — sample diagrams of the story publish flow; copy the closest one for its
  layout, not for its names
- `examples/gif/order-flow/` — a `.diagram.js` + `.anim.js` pair to start a GIF from
- Tests: `node --test tests/*.test.js` (set `EXCALIDRAW_OFFLINE=1` to skip the rendering tests; the GIF tests are
  skipped when the npm packages are missing)
