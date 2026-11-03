---
name: visual-deck
description: Use when creating a visual, low-text PowerPoint (.pptx) slide deck from scratch — branded, icon-driven, minimal words, with an agenda slide and a full speaker-script in the notes. Encodes the user's preferred style (dark title/closing slides, icons in colored circles, big-number callouts, card grids) and renders + visually QAs the result via WPS Office on this Windows machine (no PowerPoint/LibreOffice installed).
---

# Visual Deck

Build polished, **low-text, visual** slide decks with pptxgenjs and verify them with a **real render** via WPS Office. This is the user's house style — favor it for any "make me slides / presentation / pptx" request unless they ask otherwise.

## House style (the user's stated preferences)

- **Few words per slide.** Headline + 3–6 short fragments. Detailed prose goes in **speaker notes**, never on the slide.
- **Visual every slide:** icon-in-circle, card grid, big-number callout, comparison columns, or a table. No plain bullet-on-white slides.
- **Dark "sandwich":** title slide + closing slide on a near-black background; content slides on white.
- **Motif:** brand-color circle with a dark icon, repeated across slides. A thin top brand rule + a small `NN / TOTAL` locator top-right + a short kicker label (small-caps, gray) under the rule. **No accent stripes down card edges** (reads as AI filler).
- **Agenda / mục lục slide** right after the title (numbered circles, 1–2 columns).
- **Speaker notes = the full spoken script**, written to land the slide in ~60–90s, pacing the whole deck to the time budget (e.g. 15 min ≈ 11 slides).
- **Never invent data.** For metrics you don't have, render an obvious dashed "your figure" placeholder box + a label for what to measure.
- **Match an existing brand** when one is supplied: sample exact hex from a reference PDF/image (see Color sampling) and reuse its fonts, kicker/locator chrome, and logo motif.

## Content principles (earn the slot, don't just fill slides)

- **Lead with value, not removal.** "What this unlocked" beats "what we replaced." If the story reads as "we got rid of X," reframe around what the audience gains.
- **One vivid concrete example beats six adjectives.** A real before/after walkthrough (a bug fixed in minutes, a feature shipped end-to-end) lands harder than "faster / faster / faster."
- **Tell the human moment.** The most motivating slide is usually a person ("someone who never coded now ships"), not a process diagram. Give it its own slide.
- **Be honest about weak spots.** Mark in-progress work as in-progress; for "results," show real early numbers + an explicit "hard metrics still being instrumented" rather than unquantified claims.
- **Make hints operational.** "Your first week / what Monday looks like" beats an abstract bullet list.

## Extra visual components (beyond cards/grids)

- **AI-core / focal motif:** 3 concentric `OVAL`s (no fill, thin line) behind a filled brand circle + icon — vivid hero accent on dark slides.
- **Node diagram (native, editable):** center circle + `LINE` spokes to small icon-circles (use `flipH/flipV` to aim a line into each quadrant; place lines first, nodes on top). Good for "X connects to systems A/B/C."
- **Pipeline / process flow:** N equal cards with `arrowInk` images in the gaps; highlight the final card in the brand color. Compute `gap = (CW - N*cardW)/(N-1)`.
- Watch chip rows: equal-width chips (`w = (CW - (n-1)*gap)/n`) never overflow; length-based widths do.

## Environment (this Windows machine)

- Node 22 is on PATH. Global modules live in the folder printed by `npm root -g` — **set `NODE_PATH` to it** when running the build script.
  Installed globally: `pptxgenjs`, `react-icons`, `react`, `react-dom`, `sharp`. (If missing: `npm install -g pptxgenjs react-icons react react-dom sharp`.)
- The bundled **pptx skill** has the pptxgenjs API reference + `scripts/rezip.py` (always run it after `writeFile` to compress the output). Path pattern: `…/skills-plugin/**/skills/pptx/`. Read `pptxgenjs.md` there for API details.
- **No PowerPoint or LibreOffice.** Render/QA goes through **WPS Office COM** (`kwpp.Application`) → export PDF → rasterize with PyMuPDF (`fitz`). Python has `pymupdf` and `pypdf` available.

## Workflow

1. **Clarify** (AskUserQuestion): topic/stance, language, length (→ slide count), whether real metrics exist, brand/template to match.
2. **If matching a brand:** render the reference (PyMuPDF for image-PDF, or read the image) and **sample exact colors** before designing.
3. **Write the build script** (`deck.js`) using `template.js` in this skill folder as the scaffold. Keep text short; put the script in `addNotes`.
4. **Build:**
   ```bash
   cd <deck-dir> && export NODE_PATH="$(npm root -g)" && node deck.js
   python "<pptx-skill>/scripts/rezip.py" Deck.pptx
   ```
5. **Render + visual QA** (see render-and-qa.md) — export to PDF via WPS, rasterize, and **actually look at every slide** for overflow, overlap, low contrast, mispositioned chrome. Fix and re-render only changed slides.
6. **Deliver:** summarize the slide flow, flag any fill-in placeholders, and note acceptance criteria the user must still meet (e.g. team review).

## Color sampling (match a brand)

```python
from PIL import Image
from collections import Counter
im = Image.open("ref.png").convert("RGB"); W,H = im.size; c = Counter()
for y in range(0,H,3):
    for x in range(0,W,3):
        r,g,b = im.getpixel((x,y))
        if r>200 and g>170 and b<120:          # tune the predicate to the target hue
            c[(r//8*8,g//8*8,b//8*8)] += 1
print([f"#{r:02X}{g:02X}{b:02X}" for (r,g,b),_ in c.most_common(5)])
```

## Fonts

Use **Arial** (or Calibri) for body and anything where fit matters — they render true-to-width in the WPS QA preview. Pair with a safe serif (Cambria/Bookman) only if the brand calls for it. Never default to Aptos.

## Gotchas

- Hex colors: **no `#`**, no 8-char alpha (corrupts the file). Use the `opacity`/`transparency` props.
- Don't reuse a shadow/option object across `addShape` calls — pptxgenjs mutates it. Use a `makeShadow()` factory.
- Bullets: `bullet: true`, never unicode `•`.
- WPS COM: ProgID is `kwpp.Application`; `Presentation.SaveAs(path, 32)` = PDF. `$PID` is reserved in PowerShell — use another var name in loops.
- After editing the `.pptx`, **re-export the PDF before rasterizing** or you'll QA a stale render.
