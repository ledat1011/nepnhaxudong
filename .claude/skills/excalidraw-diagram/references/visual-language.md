# Visual language

One meaning → one look, in every diagram. The kit applies these rules; this file says why and what to pick.

## Colour = meaning

| Palette key | Colour | Meaning | Component |
|---|---|---|---|
| `service` | orange `#ffd8a8` | service / consumer of the system in focus | `serverStack`, `card({ color: 'service' })` |
| `queue` | blue `#a5d8ff` | message queue / topic | `queue` |
| `data` | yellow `#ffec99` | database / storage / cache | `database` (badge `doc` = document DB, `file` = file storage) |
| `other` | violet `#d0bfff` | other internal service (another service of the same company) | `card` |
| `external` | grey `#e9ecef` | client / external system / third party | `browserWindow`, `card({ color: 'external' })` |
| `person` | pink `#fcc2d7` | end user / recipient | `person` |
| `channel` | green `#b2f2bb` | output channel / success result | `channel` |
| `fail` | light red `#ffc9c9` | failure / error / non-match | `card({ color: 'fail' })` |
| `event` | turquoise `#c3fae8` | an event on a timeline (created, retried, limit reached) — not a component | `card({ color: 'event' })` |
| `decision` | white | decision | `diamond` |

- "System in focus" = the service the diagram is about. In an orders-service diagram the orders API and consumers
  are `service`; payment-service is `other`. In a payment-service diagram it is the other way round.
- `d.legend()` (call it last) lists only the colours used. Draw it whenever 3 or more colours are used.
- A component type with no palette entry: pass a hex colour as the component's `color` — `d.card({ …, color: '#dbe4ff' })` — and use that colour the same way everywhere in the diagram. A hex colour is used as-is and is not tracked, so it never adds a palette row to the key. List it with `d.legend({ …, extra: [{ color: '#dbe4ff', label: 'batch job' }] })`. Propose adding it to `PALETTE` / `LEGEND_LABELS` in `lib/kit.js` and to this table; add it only after the user agrees.

## Highlight

- New part (PR / ticket): `d.highlight({ kind: 'new', title: '★ new in PROJ-123' })` — thick orange frame, plus
  `kind: 'new'` arrows (thick orange) for the new flow.
- Problem (stuck / failing): `d.highlight({ kind: 'problem', title: '⚠ stuck after 300 s' })` — red frame, plus
  `kind: 'fail'` arrows.
- At most one highlight per diagram (the lint warns). Two regions → two diagrams.

## Text

| Use | Font | Size | Function |
|---|---|---|---|
| title | Excalifont | 44 | `d.title` |
| subtitle | Nunito | 19 | `d.title({ subtitle })` |
| component name | Excalifont | 24 (22 for queue / database / card) | built into the components |
| note under a component | Nunito, dark grey | 18 | `note:` option of the component |
| arrow label | Nunito | 19 | `link(…, { label })` |
| free note | Nunito | 18 | `d.note` |

- About 40 characters per line, at most 3 lines per note (the lint warns).
- **Readable in a PR or a wiki page:** the PNG is shown about 1600 px wide. The smallest text must stay ≥ 11 px there:
  `fontSize × 1600 / canvasWidth ≥ 11`. With 18 px notes the canvas may be at most ~2600 px wide. The lint reports
  this as `ERROR text too small`. The fix is a narrower layout or two diagrams — never a smaller font.
- Straight style (`createDiagram({ style: 'clean' })`): same colours and components, `roughness: 0`, all text Nunito.
  Use it only after the user chose it for a formal target.

## Arrows

| Kind | Look | Meaning |
|---|---|---|
| `main` | solid black, gentle curve | main flow |
| `data` | dashed black | data read / write, side call |
| `parallel` | dashed black + label "in parallel" | parallel / asynchronous |
| `fail` | red | failure / fallback path |
| `new` | thick orange | new flow (inside a highlight) |

- Label an arrow only at a branch (yes / no), a condition ("after PREPARED") or an entry point (the endpoint).
  A plain one-in-one-out step has no label.
- Arrows never cross text (the lint reports `arrow crosses text`); keep arrow crossings to a minimum.
- `link()` binds the arrow to both components, so it follows when a component is dragged in an Excalidraw editor (excalidraw.com, the Obsidian or VS Code plugin).
- When a diagram uses more than one arrow kind, say what they mean: add a short note under the colour key (e.g. "dashed = data write · red = failure / fallback path"), because the key only lists fill colours.
