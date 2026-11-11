# Rice Story Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 8 rice story scenes an intro and a small loop, made of layers cut from the approved sketches plus code-drawn effects, and remove the unused layered-SVG scene path.

**Architecture:** A Python tool cuts the moving parts out of `brand/story/phac/*.webp` into alpha WebP files and writes their positions to a JSON manifest. On the page, the motion code builds an overlay in each scene's stage when the scene comes near, waits for its images, and runs the scene's GSAP intro and throttled loop through the existing story machinery.

**Tech Stack:** Python 3 + Pillow (tool), Next.js 16, React, GSAP 3 + ScrollTrigger, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-chuyen-dong-chuyen-hat-nep-design.md`

## Global Constraints

- Owner execution choice: "viết spec đi rồi làm đi". Native execution, no review stop between tasks.
- Machines (harvester, truck) only shake or turn wheels in place. People do not move.
- Only `transform` and `opacity` move. No layout change, no CLS.
- Reduced motion: GSAP is not loaded, so there is no overlay and no layer download.
- Each layer file is under 40 KB; the layers of one scene total under 120 KB.
- At rest, every layer sits exactly on its place in the sketch.
- Code, comments, tests and commits in English; the dictionary and docs in `docs/` stay as they are (Vietnamese).

## Review Focus

1. A layer image that fails to load: the scene keeps the static sketch, no half overlay. The test lives in Task 2.
2. A scene already past its line on load (a `#hash` link): the intro shows its final frame at once. Task 4 test.
3. The pause button and an off-screen scene stop the loops. Task 4 e2e.
4. Resizing between phone and desktop keeps the overlay aligned (positions in percent). Task 2 test plus Task 6 screenshots.
5. 320 px: no sideways scroll from overlay effects that run outside the stage (the stage clips). Task 4 e2e.

---

### Task 1: Layer cutting tool and assets

**Files:**
- Create: `brand/tools/cut-story-layers.py`, `brand/story/layers.json`
- Create (generated): `web/public/lop/*.webp`, `web/src/lib/story/scene-layers.json`, `web/public/story/canh-2-nang-mua-gio-dem.webp`
- Test: `web/src/lib/story/scene-layers.test.ts`

**Interfaces:**
- Produces `scene-layers.json`: `Record<SceneSlug, Array<{ name: string; src: string; left: number; top: number; width: number; height: number; originX: number; originY: number }>>`. The box values are percent of the 1200 × 675 scene; the origin values are percent of the layer box.

- [ ] Write the test: every entry's file exists, its WebP size matches the box (±1 px at 1200 × 675), each file is under 40 KB and each scene's files total under 120 KB; the night image exists at 1200 × 675.
- [ ] Measure each part on the 1600 px sketches; write `layers.json` (rect, circle or polygon, feather px, pivot, optional flat-fill patch).
- [ ] Write the tool; run it; look at each layer over the sketch.
- [ ] Run the test; commit.

### Task 2: Scene stage and overlay builder

**Files:**
- Modify: `web/src/components/home/RiceStory.tsx` (wrap the img in a `data-story-stage` box that carries `story-scene-fade`)
- Create: `web/src/lib/story/overlay.ts`, test `overlay.test.ts`

**Interfaces:**
- `buildOverlay(stage: HTMLElement, slug: SceneSlug): Promise<HTMLElement | null>`. It appends `div[data-story-overlay]` (hidden) with one `img[data-part=<name>]` per layer, absolutely positioned in percent, plus `svg[data-effects]` (viewBox 0 0 1200 675). It resolves after every image loads, and returns null (and removes the overlay) if one fails.

- [ ] Tests: the markup keeps the same img; the overlay boxes match the manifest; null and no overlay left when an image errors; nothing shown before load.
- [ ] Implement; run the related tests; commit.

### Task 3: Scene motions and code effects

**Files:**
- Rewrite: `web/src/lib/motion/story/scene-motions.ts`
- Create: `web/src/lib/motion/story/effects.ts` (rain, wind lines, ripples, steam, husk, dust, birds, stars, rice flow, coal glow, hot-air arrows), test `effects.test.ts`
- Modify: `scene-motions.test.ts`

**Interfaces:**
- `SCENE_MOTIONS: Record<SceneSlug, (gsap, overlay: HTMLElement) => SceneMotion | null>`, where `SceneMotion = { intro: Timeline; loop: Timeline | null }`. A scene whose parts are missing returns null.
- Each effect: `(svg: SVGSVGElement, area: {x,y,w,h}) => SVGElement[]` creating its own nodes inside `svg[data-effects]`.

- [ ] Tests per scene: builds with all parts, returns null without one, the intro ends at the rest pose, the loop is repeat -1.
- [ ] Implement the effects, then the 8 motions; commit.

### Task 4: Wire into the story motion

**Files:**
- Modify: `web/src/lib/motion/story/rice-story.ts`, `rice-story.test.ts`, `web/e2e/motion.spec.ts`

- [ ] Replace the inline-SVG load with `buildOverlay` at `STORY_LOAD_AHEAD`; keep intro, loop, off-screen and pause logic.
- [ ] Unit tests updated; e2e: no layer request at load, layers load near the scene, the loop stops off-screen and on pause, reduced motion loads none, step 2 ends at night, no CLS, no sideways scroll at 320 px.
- [ ] Commit.

### Task 5: Remove the layered-SVG path and update docs

- [ ] Delete the old scene SVGs, the `story:build` scripts, `inline-svg.ts`, the scene-part tests and the skipped e2e tests; keep the SVG safety rules that `ProductBag` uses; delete `vectorize-pose.py` if nothing else uses it.
- [ ] Write decision `0017`, update `0014` and `brand/story/phac/README.md`.
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run test:tools`; commit.

### Task 6: Verify and deliver

- [ ] Production build; screenshots and frame captures of each scene at 375 and 1280 px; compare with the sketches.
- [ ] Full e2e; antislop Delivery Gate; PR; merge after CI.
