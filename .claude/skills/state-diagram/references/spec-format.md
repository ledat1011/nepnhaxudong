# Spec format

## `state_machine.py` — status state machine

```jsonc
{
  "highlight_label": "★ new in this change",     // title of the highlight box
  "start": "POST preview",                      // optional start dot above the first state; text shown when the first state has several incoming arrows
  "new": ["PUBLISHING"],                      // ids drawn yellow inside the highlight box
  "legend": {"wait": "waiting for the website"}, // optional legend texts: claim / done / wait / new / solid / new / dash
  "column": [                                   // the main path, top to bottom; every state has the same width
    {"id": "CREATED", "kind": "done"},          // kind: claim (-ING, rectangle) | done (-ED, rounded) | terminal (rounded) | wait (hexagon)
    {"id": "WORKING", "kind": "claim", "label": "optional text instead of the id"}
  ],
  "side": [                                     // a state to the right of one column row, reached by a straight horizontal arrow
    {"id": "ERROR", "kind": "terminal", "row": "PUBLISHING"}
  ],
  "free": [                                     // pseudo pairs drawn on the far right, e.g. the expiry
    {"from": "any non-terminal status", "to": "EXPIRED", "label": "created more than 24 h ago", "style": "dash"}
  ],
  "edges": [
    {"from": "A", "to": "B"},                                    // next row: straight down
    {"from": "A", "to": "D", "label": "direct path"},            // skips rows: left lane (default)
    {"from": "C", "to": "F", "side": "right", "label": "..."},   // skips rows on the right (outer right lane)
    {"from": "B", "to": "A", "style": "dash", "label": "no progress 15 min"},  // goes up: inner right lane
    {"from": "W", "to": "W", "label": "not finished → retry"},    // loop (right side; bottom-right when a side arrow uses the right side)
    {"from": "X", "to": "ERROR", "style": "new", "label": ["line 1", "line 2"]}
  ]
}
```

Optional top-level keys (both generators):

- `"highlight": "problem"` — red palette instead of yellow / orange. Use it for a "before" diagram that marks where the old
  flow gets stuck or fails: the stuck states go in `new`, the stuck loops get `"style": "new"` (drawn thick red).
- `"highlight_titles": {"STATE_ID": "⚠ page stays old"}` — a title per highlight box (falls back to `highlight_label`).
  A box title must end before the incoming arrow in the middle of the box (about 16 characters); the script warns when it
  is longer.
- `"notes": [{"at": "STATE_ID", "side": "left" | "right", "title": "Why stuck: …", "lines": ["bullet 1", "bullet 2"]}]`
  (state_machine only) — an explanation box beside a state, joined to its highlight box by a line. Each item is one
  bullet, wrapped at `wrap` characters (default 46) with the next lines indented. Left notes stay below the legend; use
  `"side": "right"` (with `offset`, default 360 px from the column) when a left lane passes the state's row. Put a
  non-breaking space (` `) in "300 s"-like values so the number and unit stay on one line.
- `legend` key `arrow_<style>` (e.g. `"arrow_new": "where it gets stuck"`) names an arrow kind separately from the shape
  of the same kind (`"new": "stuck status"`).

- `style`: `solid` (default) | `new` (thick orange, label orange) | `dash` (grey, label grey).
- `label`: a string (wrapped automatically) or a list of lines (kept as given).
- A label is drawn only when the target has more than one incoming arrow or the source more than one outgoing arrow
  (`"force_label": true` overrides). Missing labels where the rule needs one are printed as warnings.
- Lane placement: left lanes by span (shortest innermost); up-arrows share an inner right lane when their spans do not
  overlap; right skip-arrows go outside the up-lanes. Attachment offsets keep lanes from crossing.

## `flow_diagram.py` — component flow

```jsonc
{
  "group": {"title": "★ NEW_STATUS (new)", "nodes": ["COORD", "TOPIC", "WORK", "DB"]},   // one highlight box
  "nodes": [
    {"id": "WAIT", "label": "WAITING_X", "shape": "hex", "col": 0, "row": 0},
    {"id": "COORD", "label": ["① Coordinator", "1 message per 1000 rows"], "col": 1, "row": 0, "bold_first": true},
    {"id": "TOPIC", "label": ["② Message topic", "x-topic"], "shape": "cyl", "col": 2, "row": 0},
    {"id": "DB", "label": ["table_x", "③ PENDING → ⑤ DONE"], "shape": "cyl", "col": 1, "row": 1, "span": 2}
  ],
  "edges": [
    {"from": "COORD", "to": "TOPIC", "style": "new", "label": "publish (batch)"},   // same row: straight horizontal
    {"from": "COORD", "to": "DB", "route": "v", "label": "③ claim"},                // overlapping columns: straight vertical
    {"from": "WORK", "to": "DB", "route": "vh", "label": "⑤ row DONE"},             // down from the bottom, then sideways
    {"from": "WORK", "to": "ERR", "route": "hvh", "label": "more than 10 attempts"},// right side out, down, into the side
    {"from": "WORK", "to": "WORK", "style": "new", "label": "error → retry"}         // loop on top
  ]
}
```

- `shape`: `rect` (default) | `round` | `hex` | `cyl` (topic / table).
- Column widths follow the widest node; column gaps grow to fit the labels between them.
- Several arrows leaving the right side of one node are spread vertically so they do not overlap.
