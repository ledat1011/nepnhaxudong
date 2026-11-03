# Scenario tests

Manual scenarios to run with a real Claude session after changing the skill. Pass criteria (all must hold): no
lint ERROR, smallest text readable at a 1600 px display, palette respected (yellow = database / storage, blue =
message queue, orange = service), saved in the right folder, at most 4 fix rounds.

## S1 — architecture: publish a story
Prompt: "Draw an architecture diagram of how the admin app publishes a story: admin app, backend, database,
website. For the project docs."
Expected with skill: one overview diagram (layout row + fan-out), saved in `docs/diagrams/`.

## S2 — sequence: publish request
Prompt: "Draw a sequence diagram of the publish request: admin app -> backend -> website revalidate call."
Expected with skill: lifelines + messages; only calls confirmed in the code are drawn.

## S3 — kind not in the catalogue: timeline
Prompt: "Draw a before / after timeline of the revalidate call and the commit, to explain the bug to the owner."
Expected with skill: a timeline composed from line + notes + cards, saved in `docs/diagrams/`.

## S4 — plain diagram request makes no GIF
Prompt: "Draw the order flow of examples/gif/order-flow as a diagram."
Expected with skill: `.excalidraw` + PNG only; no `.anim.js`, no GIF, and no offer to make one.

## S5 — GIF requested from the start
Prompt: "Make a GIF of the order flow: an order goes from the customer through the web shop to the order service,
which writes it to the DB and publishes it to two workers."
Expected with skill: the diagram follows the GIF limits (≤ ~12 components, every moving path a `d.link`);
`<slug>.anim.js` next to the script; previews looked at; `verify.js` all PASS; one save question for PNG + GIF.

## S6 — GIF for a diagram already saved
Prompt: "Animate <a diagram already in docs/diagrams that has a .diagram.js>."
Expected with skill: starts from that `.diagram.js` and keeps its slug; edits its `.anim.js` when there is one;
on save, `build.js --out` copies the `.anim.js` (as `<slug>-v2.anim.js` when the build moved to `-v2`).
