# Layout patterns

Pick the pattern by the **shape of the content**, not by the diagram's name. This list is open: when nothing fits,
combine patterns or make a new one, say why in one sentence, and propose adding a good new one here (add it only
after the user agrees).

| Content shape | Pattern | Example |
|---|---|---|
| chain ≤ 6 steps | **row**: one row, left → right | `examples/story-publish-overview.diagram.js` |
| chain > 6 steps | **snake**: row 1 left → right, then down, row 2 continues; or two diagrams | two rows, the second continues the first |
| one step fans out to parallel branches | **fan-out**: branches leave the right side, one per row, or up / down | `backend` → `postgres` and `media` in `examples/story-publish-overview.diagram.js` |
| who calls whom over time | **sequence**: `lifeline` per participant, `message` per call, time goes down | `examples/story-publish-sequence.diagram.js` |
| statuses and transitions | **state**: one column (main path down) or a loop; PR state machines in the strict style → state-diagram skill | — |
| events with dates / times | **timeline**: one horizontal `line`, `card` or `note` per event above / below it | `examples/story-publish-timeline.diagram.js` |
| old vs new | **before / after**: two diagrams (or two frames) with the same positions; only the changed part differs | — |
| one central thing, many neighbours | **hub and spoke**: hub in the middle, neighbours on a circle, arrows out | — |
| layers (client / service / data) | **layered rows**: one row per layer, top → bottom | `examples/story-publish-overview.diagram.js`: services above, databases below |
| a chain of fallbacks | **chain**: decision, then one row of options linked by `fail` arrows | — |

## Spacing that passes the lint

- Column step 320–340 px between server stacks / queues in a row (component 220 px + room for its name).
- Row step ≥ 420 px when the upper row has notes; check `below` of the upper component.
- Names sit above server stacks and queues. An arrow into the **top** of one stops above the name automatically (the bbox has an `above` field), so it never crosses the name; it just ends higher. Use `queue({ labelBelow: true })` when a queue sits under the component that feeds it, so the arrow reaches the icon itself.
- Long consumer names (24+ characters) are wider than their 220 px icon. Leave ≥ 340 px between neighbouring stacks, or move a queue ~30 px lower so its name does not touch the stack name next to it (see `examples/story-publish-overview.diagram.js`), and add a one-line comment in the script saying why.
- An arrow that leaves the **bottom** starts under the component's note automatically (`below`).
- Keep the whole diagram ≤ ~2600 px wide (readability rule) and the aspect ratio ≤ 2:1.
- About 20 components maximum. More → an overview diagram plus a detail diagram (the overview has a `card`
  "image upload (next diagram)" that the detail diagram starts from).

## Labels

- `link(…, { label })` places the label beside the curve automatically. Use `labelAt: [cx, cy]` (the label centre)
  when the automatic place collides; the lint names the collision.
- A label next to a frame border must sit fully inside or fully outside the frame.
- Keep a label within ~40 px of its arrow; a label far from its line reads as a caption of the nearest component. For a set of identical arrows (a fallback chain), one shared label is fine — place it above the first arrow.

## Frames

- `d.frame` = a boundary (one service, one cluster, one environment). Components of the service in focus go inside;
  callers, other services and end users go outside.
- A component's name must not cross the frame border; leave ~40 px between a component and the border.

## Sequence recipe

```js
const client = d.lifeline({ x: 0, y: 0, label: 'web-shop', color: 'external', length: 700 });
const orders = d.lifeline({ x: 420, y: 0, label: 'orders-service', length: 700 });
d.message(client, orders, 140, { label: 'POST /orders' });
d.message(orders, orders, 220, { label: 'validate' });
d.message(orders, client, 600, { label: '201 + order id', reply: true });
```
Lifelines 400–420 px apart; messages ≥ 60 px apart vertically; a message label must not cross a lifeline in between
(the lint reports `line crosses text`).

## Timeline recipe

A wide timeline gets the aspect warning; stack 'before' and 'after' axes vertically (see the example) instead of making one long axis.

```js
d.line({ points: [[0, 300], [2000, 300]], kind: 'main' });
// one event: a short tick + a card above (or below, alternating when events are close)
d.line({ points: [[400, 285], [400, 315]] });
d.card({ x: 290, y: 150, w: 220, label: 'day 0\ncreated', color: 'event' });
```
Events use `event` (turquoise). A step done by a service keeps that service's colour (`service` / `other`), and a failure keeps `fail`.
