# Animated GIF of a diagram

Read this only when the user asks for a GIF (SKILL.md step 10). The GIF animates a diagram built by `lib/build.js`:
icons travel along its arrows, a ring pulses on each component that receives something, and badges count arrivals
("2 / 3"). `lib/gif/animate.js` reads the arrows and component boxes from the `.excalidraw` file, so icons stay
exactly on the arrows, including curved ones.

Run every command with a tool timeout of at least 300000 ms.

## Diagram limits for a GIF

- One main path, ≤ ~12 components.
- Every moving path is a `d.link` between two components (a `d.line` cannot be animated).
- Paths that carry traffic both ways get no arrowheads: `d.link(...)` returns the arrow, so set
  `link.endArrowhead = null` on it in the script.
- A failure gets its own path: a `kind: 'fail'` link to a component for the failed outcome, so a `fail` icon can
  travel on it.
- High-level component icons, no detailed UI mock-ups, no large areas of one strong colour; brand colours as an
  accent only (for example a black title bar on a white window).

## Steps

1. **Write the story as a list** before any code: each step = what moves, from which component to which, which
   icon. One meaning per icon (table below). "Many" (recipients, workers) = one icon per item, started 0.2–0.35 s
   apart.
2. **Write `<slug>.anim.js`** next to `<slug>.png` / `<slug>.excalidraw` (and next to the `.diagram.js`, so
   `build.js --out` copies it). Start from `$K/examples/gif/order-flow/order-flow.anim.js` (a simple pipeline with
   a fan-out). A diagram in the notes that already has a `.anim.js`: copy its `.diagram.js` and `.anim.js` into the
   scratchpad, edit the copies there, and save with `build.js --out` (SKILL.md step 10) — never edit the notes copy
   in place.
3. **Preview 3–4 moments** and open each PNG it prints with the Read tool (they go to
   `<temp>/excalidraw-gif/<slug>/`, nothing to clean up): `node "$K/lib/gif/animate.js" <slug>.anim.js --preview 1.5,4,7.5`
   The first line it prints gives the loop length (`loop 9.5s`); pick the preview times inside it.
   Check: icons on the arrows, landing inside the right component, not more than ~4 moving at once, no icon
   covering a label for long.
4. **Build and check the GIF:**
   `node "$K/lib/gif/animate.js" <slug>.anim.js` then `node "$K/lib/gif/verify.js" <slug>.gif`
   `verify.js` decodes the GIF with an independent decoder and prints PASS / WARN for size (≤ 3 MB), width
   (≥ 1200 px), endless loop and seamless loop; it exits 1 on any WARN — fix it before showing the GIF. Then open
   the contact sheet it prints (8 frames) and check the story reads in order. Report size, frames and seconds.

After any change to the diagram, rebuild it with `lib/build.js` and run step 4 again — positions are read from the
new `.excalidraw`, nothing to update by hand.

## `.anim.js` API

```js
module.exports = a => {
  const { arrow, reverse, join, extend, extendStart, center, trip, pulse, count, settings } = a;
  const t1 = trip('letter', extend(arrow('web shop', 'order-service'), 50), 0.4, { to: 'order-service' });
  count('results', trip('answer', arrow('api', 'results'), t1 + 0.2, { to: 'results' }), { total: 3 });
};
```

| Call | Meaning |
|---|---|
| `arrow(from, to)` | points of the arrow drawn from component `from` to `to`. A component is named by any text it shows (label below the icon or caption inside it), exact match first, then substring |
| `reverse(pts)` / `join(a, b, …)` | travel an arrow backwards / chain arrows into one trip |
| `extend(pts, d)` / `extendStart(pts, d)` | continue `d` units past the end / before the start, so the icon lands in / leaves from inside the component; negative `d` cuts |
| `center(name)` | middle of a component, e.g. `join([center('db')], arrow('db', 'api'))` |
| `trip(icon, pts, t0, { to, speed, color, fill, label })` | an icon travels from `t0` (s); returns its arrival time. `to` = component that pulses on arrival. `speed` in units/s (default 600). `color` = the icon's accent colour and its arrival ring (default: the icon's own colour); `fill` = the inside colour of a `dot`; `label` = short text (1–3 words, e.g. the value written) in a pill that travels with the icon — use it instead of static arrow text when the text only matters while the icon moves |
| `pulse(name, t, color)` | a ring without a trip |
| `count(name, t, { total, color })` | badge "n / total" on the component's top-right corner, +1 at `t`; fades out before the loop restarts. Only where 2 or more items arrive at the same component ("1 / 1" says nothing) |
| `settings.hold` | seconds the final state stays before the loop (default 1.6) |

Chain times with the returned arrival times — never hard-code a whole timeline.
A `count` badge counts the outcome its component stands for: an item that fails there is not counted; its `fail`
trip shows it instead.

| Icon | Meaning |
|---|---|
| `letter` | letter, message, request, order |
| `answer` | answer, reply, success |
| `list` | batch, list, registration |
| `doc` | document, file |
| `dot` | data write / read (on dashed arrows); `fill` changes its colour |
| `bolt` | event, webhook, trigger |
| `fail` | error, rejection |

Need another meaning → propose a new icon for `lib/gif/icons.js` and add it only after the user agrees (keep one
meaning per icon).

Options: `--width` (default 1600, keeps the smallest diagram text readable; 1200 for a smaller file),
`--fps` (default 25), `--out <file.gif>` (default `<slug>.gif` next to the `.anim.js`).
A 12 s loop at 1600 px is about 1.5–2 MB.

## Common mistakes

| Symptom | Fix |
|---|---|
| `GIF packages are missing` | ask the user, then run the `npm ci --prefix …` command the message prints (once per machine, ~34 MB) |
| `no component named "X"` | the error lists every component's texts; use one of them |
| `"Studio" matches 2 components` | use the text only one of them has (its label) |
| `the arrow goes from "B" to "A"` | `reverse(arrow('B', 'A'))` |
| `0 arrows from A to B` | the path is a `d.line` or has no link; draw it with `d.link` in the diagram |
| icon stops at the edge, then vanishes | `extend(…, 40–120)` so it lands inside the component |
| everything moves at once, looks busy | stagger starts, chain from arrival times, ≤ ~4 icons moving |
| GIF > 3 MB | `--width 1200`, shorter loop, fewer simultaneous icons |
| `missing <slug>.png` | build the diagram first; the `.anim.js` must sit next to it with the same slug |

Windows PowerShell 5.1 reads UTF-8 files without BOM as ANSI: edit `.anim.js` / `.diagram.js` with the Edit tool,
never with `Get-Content | Set-Content` (it breaks `①`, `→`, `·`).
