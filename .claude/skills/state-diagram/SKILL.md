---
name: state-diagram
description: Draws a clean, reviewer-friendly diagram of a status state machine (enum + transitions) or of a component flow (who publishes, who subscribes, which table is written) as SVG + PNG for a pull request, an issue or the project docs. House style the user asked for — one straight column of equal-width states, right-angle (orthogonal) arrows only, only the NEW state coloured with a bright box around it, new transitions thick orange, rollbacks dashed grey, and a label on an arrow only where a state has more than one incoming or outgoing arrow. Use whenever the user asks to "draw a state diagram", "state machine diagram", "diagram of the statuses", "show the state transitions", "flow diagram for the PR", "export the diagram as an image", "highlight the new state", "draw the old flow and mark where it gets stuck", or wants a picture of how a status / workflow moves — in any language — even if they do not say "state diagram". For a hand-drawn sketch, an architecture / component overview, a sequence, a timeline or any other diagram style, use excalidraw-diagram instead.
---

# State diagram (house style)

Two generators share one look:

| Script | Draws | Input |
|---|---|---|
| `scripts/state_machine.py` | a status state machine: one vertical column, side detours, rollbacks, highlight box | JSON spec (`examples/story-status.json`) |
| `scripts/flow_diagram.py` | a component flow: nodes on a grid (row / col), caller → service → database → website cache, one highlight box around the new part | JSON spec (`examples/publish-flow.json`) |
| `scripts/render_png.py` | SVG → PNG with Edge / Chrome headless (no browser pane, no server) | the SVG |

Spec format and every field: `references/spec-format.md`. The examples are a complete diagram each
(a story post that is published and then revalidated on the website) — copy one and change it rather than starting from zero.

## Style rules (the user's rules — do not drift from them)

1. **States in one straight column**, all the same width, centred. The main path is straight arrows down.
2. **Only right-angle arrows.** No curves. An arrow that does not go to the next row leaves from the **side** of the state,
   goes out to a lane, runs vertically, and comes back into the **side** of the target. Lanes never cross: the outer lane
   enters the target lower than the inner lane.
3. **Only the new state is coloured** (yellow fill, orange border) and it sits inside a **bright box** (light yellow,
   thick orange border, title like "★ new in this change"). All other states are white with a dark outline.
4. **Arrow kinds:** dark = existing transition, **thick orange = new transition**, dashed grey = rollback / timeout / expiry.
5. **Label rule:** put text on an arrow **only when its target has more than one incoming arrow, or its source has more than
   one outgoing arrow** (a branch or a merge). Then **every** arrow into / out of that state gets a short text saying *when*
   that path is taken ("admin presses publish", "draft is discarded", "revalidate failed 3 times", "no progress 15 min").
   A plain one-in-one-out step has no label. The script prints `WARNING: label needed …` for any such arrow without text — fix
   every warning before you export.
6. **Shapes:** rectangle = claim / in progress (-ING), rounded = done (-ED) or terminal, hexagon = waiting for something
   outside (e.g. the website), dashed box = pseudo source like "any non-terminal status". A legend goes top-left.
7. **Short labels**, 1–2 lines, placed beside a vertical segment or above a horizontal one, never across another line or the
   box title. Leave room around the highlight box (the script uses a wider row gap above and below a new state).
8. **"Before" diagrams** (the old flow, "where does it get stuck"): same layout, `"highlight": "problem"` (red). Only the
   stuck states are coloured, each in its own red box with a short title (`highlight_titles`, e.g. "⚠ page stays old",
   "⚠ same risk" for a state with the same design that was not observed). The stuck loop is a thick red arrow whose label
   says what happens after the failure ("transaction aborted at 30 s; 15 min later back to DRAFT"). Say which stuck states were
   observed and which are only the same risk — from test runs / logs, not guessed. Example:
   `examples/story-status-before.json`.
   **Optional — only when the user asks for it** ("add why it gets stuck", "explain why", in any language): a `notes` box beside
   each stuck state that says why (what the one long step does, the number that makes it slow, what the abort leaves
   behind, why the retry fails the same way). By default, draw the diagram without notes.
9. **Flow diagrams:** one straight row for the main path, side tables / error states on a second row, right-angle routes,
   the new part inside one highlight box, number the steps (①…⑦) and add a small table of the steps under the image.

## Workflow

1. **Collect the states from the code, not from memory**: the status enum, every transition method (CAS `UPDATE … WHERE
   status = …`), the rollback map / in-progress timeout, the expiry guard, the terminal list, and which code path sets
   each status. Mark which statuses / transitions the current change adds. Note side facts that matter (e.g. a status that is
   not in the expiry list).
2. **Write the spec** (copy an example to the scratchpad). Order `column` as the main path; put the new status in `new`; put
   states that hang off one row (ERROR) in `side`; mark `"side": "right"` on a skip arrow that should run on the right.
3. **Render and look at it** — always read the PNG back and check every rule above. Fix overlaps by changing the spec
   (labels, `side`, order) before touching the scripts.
   ```bash
   S="$CLAUDE_PROJECT_DIR/.claude/skills/state-diagram/scripts"
   python "$S/state_machine.py" spec.json out.svg     # or flow_diagram.py
   python "$S/render_png.py" out.svg out.png 2.5
   ```
4. **Deliver**
   - PNG + SVG in `docs/diagrams/<topic>.png` and `docs/diagrams/<topic>.svg` (inside the repo, so the user can
     open them and the SVG stays editable).
   - Show the PNG to the user in the reply or give its path.
   - For a pull request, the user drags the PNG into the description. A Mermaid version is optional (GitHub renders it):
     plain `flowchart TB` with Mermaid's **default arrows**, no `%%{init: … "curve": "step"}%%`, because Mermaid's step
     routing breaks every arrow into many small right angles and looks bad. The right-angle rule is for the SVG / PNG only.
     Use `classDef` only for the highlighted state(s).
     - A `subgraph` + `style` highlight box is fine for a state with no arrow going back up. When a highlighted state has a
       rollback / back arrow (e.g. `PUBLISHING → DRAFT`), Mermaid moves the subgraph out of the column (above its
       parent). In that case drop the subgraph and put the box title in the node label (`P["PUBLISHING<br/>⚠ page stays old"]`).
     - In `linkStyle`, set only `stroke` / `stroke-width`. Do not set `color`: dark themes draw labels on a grey
       background, and coloured label text cannot be read there.
5. **Iterate with the user**: they review the picture and point at spots. Apply the
   change to the spec, re-render, read the PNG again, send it again.

## If no browser is found

`render_png.py` looks for Edge, then Chrome, then Chromium (Windows and Linux paths). Without any of them, keep the SVG
(it opens in any browser) and tell the user that the PNG could not be made on this machine.
