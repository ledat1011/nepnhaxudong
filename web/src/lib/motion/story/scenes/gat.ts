import {
  draw,
  GRAIN,
  INK,
  INK_STROKE,
  introTimeline,
  loopTimeline,
  pick,
  type Gsap,
  type SceneMotionBuilder,
} from "../scene-kit";

/**
 * Step 3, the harvest: the father drives the combine harvester through the gold rice.
 * The harvester never drives (owner's decision): it only shakes in place, a little harder when
 * the engine starts. Chaff and dust puff out behind it (its left side) and a few birds cross the
 * sky. The reel at the front does not turn: the rice in front of it hides part of it.
 */

/** The loop: a slow engine shake, three puffs of chaff, one flight of birds. */
export const GAT_LOOP_S = 10;
/** One turn of the reel: 7 whole turns per loop, so the seam does not show. */
export const REEL_TURN_S = GAT_LOOP_S / 7;
/** How long one puff of chaff lasts, from the machine until it fades. */
const PUFF_S = 1.4;
/** Puffs of the loop, in seconds from its start. The last one ends before the seam. */
const LOOP_PUFFS_S = [1, 4.6, 7.6];
/** The birds fly from left to right, out of view at both ends, so the seam does not show. */
export const BIRDS_FROM_X = -80;
export const BIRDS_TO_X = 1290;

type Mote = { el: SVGGElement; dx: number; dy: number; delay: number };

/** Chaff ovals: start point, tilt, drift (to the left and up), delay in the puff. */
const CHAFF = [
  { cx: 478, cy: 468, tilt: -20, dx: -58, dy: -34, delay: 0 },
  { cx: 484, cy: 486, tilt: 35, dx: -72, dy: -22, delay: 0.08 },
  { cx: 474, cy: 498, tilt: 10, dx: -46, dy: -40, delay: 0.16 },
  { cx: 488, cy: 476, tilt: -45, dx: -84, dy: -46, delay: 0.24 },
] as const;
/** Dust dots, lower and lighter than the chaff. */
const DUST = [
  { cx: 482, cy: 508, dx: -62, dy: -14, delay: 0.04 },
  { cx: 474, cy: 514, dx: -40, dy: -20, delay: 0.14 },
  { cx: 490, cy: 502, dx: -78, dy: -28, delay: 0.22 },
] as const;
/** The flock, around its own point (0, y), like the birds drawn in the sky (y 100..170). */
const BIRDS = [
  { x: 0, y: 140, half: 11, bob: 1.25 },
  { x: -34, y: 128, half: 9, bob: 1 },
  { x: -24, y: 156, half: 8, bob: 5 / 6 },
] as const;

function drawChaff(effects: SVGSVGElement): Mote[] {
  const group = draw(effects, "g", { "data-effect": "gat-chaff" });
  const motes: Mote[] = [];
  for (const c of CHAFF) {
    const mote = draw(group, "g", { "data-mote": "chaff" });
    draw(mote, "ellipse", {
      cx: c.cx,
      cy: c.cy,
      rx: 4.5,
      ry: 2.6,
      transform: `rotate(${c.tilt} ${c.cx} ${c.cy})`,
      fill: GRAIN,
      stroke: INK,
      "stroke-width": 1.2,
    });
    motes.push({ el: mote, dx: c.dx, dy: c.dy, delay: c.delay });
  }
  for (const d of DUST) {
    const mote = draw(group, "g", { "data-mote": "dust" });
    draw(mote, "circle", { cx: d.cx, cy: d.cy, r: 2.2, fill: INK, "fill-opacity": 0.35 });
    motes.push({ el: mote, dx: d.dx, dy: d.dy, delay: d.delay });
  }
  return motes;
}

function drawBirds(effects: SVGSVGElement): { flock: SVGGElement; birds: SVGPathElement[] } {
  const flock = draw(effects, "g", { "data-effect": "gat-birds" });
  const birds = BIRDS.map((b) =>
    draw(flock, "path", {
      // Two curved wings that meet a little lower in the middle, as in the sketch.
      d:
        `M${b.x - b.half} ${b.y + 1} Q${b.x - b.half / 2} ${b.y - 5} ${b.x} ${b.y + 2} ` +
        `Q${b.x + b.half / 2} ${b.y - 5} ${b.x + b.half} ${b.y + 1}`,
      fill: "none",
      stroke: INK,
      "stroke-width": INK_STROKE - 0.5,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }),
  );
  return { flock, birds };
}

/** One puff of chaff at `at` seconds: each mote appears at the machine, drifts and fades. */
function puff(tl: gsap.core.Timeline, motes: Mote[], at: number) {
  for (const m of motes) {
    const t = at + m.delay;
    // immediateRender is off so a later puff does not set its first frame while it is built.
    tl.fromTo(m.el, { x: 0, y: 0 }, { x: m.dx, y: m.dy, duration: PUFF_S, ease: "power2.out", immediateRender: false }, t);
    tl.fromTo(m.el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", immediateRender: false }, t);
    tl.fromTo(m.el, { opacity: 1 }, { opacity: 0, duration: PUFF_S - 0.35, ease: "power1.in", immediateRender: false }, t + 0.35);
  }
}

/**
 * The reel turns clockwise (its lower paddles sweep the rice toward the machine) at one speed,
 * from the first frame of the intro on: the intro makes one whole turn, so it ends at rest, and
 * the loop goes on at the same speed.
 */
function turnReel(tl: gsap.core.Timeline, reel: HTMLElement, turns: number) {
  tl.fromTo(reel, { rotation: 0 }, { rotation: 360 * turns, duration: REEL_TURN_S * turns, ease: "none", immediateRender: false }, 0);
}

/** The engine starts: a shake that fades out, with a first puff of chaff. */
function buildIntro(gsap: Gsap, harvester: HTMLElement[], reel: HTMLElement, motes: Mote[]) {
  const intro = introTimeline(gsap);
  const amplitudes = [2.5, 3, 2.5, 2, 1.6, 1.2, 0.8, 0.5];
  let t = 0;
  for (const [i, a] of amplitudes.entries()) {
    const side = i % 2 === 0 ? 1 : -1;
    intro.to(harvester, { y: -a, x: side * a * 0.4, duration: 0.07, ease: "sine.inOut" }, t);
    intro.to(harvester, { y: a * 0.5, x: -side * a * 0.3, duration: 0.07, ease: "sine.inOut" }, t + 0.07);
    t += 0.14;
  }
  intro.to(harvester, { x: 0, y: 0, duration: 0.2, ease: "sine.out" }, t);
  puff(intro, motes, 0.25);
  turnReel(intro, reel, 1);
  return intro;
}

/** The engine runs: a 1 px shake, the reel turns, puffs now and then, the birds cross once. */
function buildLoop(
  gsap: Gsap,
  harvester: HTMLElement[],
  reel: HTMLElement,
  motes: Mote[],
  flock: SVGGElement,
  birds: SVGPathElement[],
) {
  const loop = loopTimeline(gsap);
  // An even number of half shakes per loop, so the harvester is back at rest at the seam.
  const yHalf = 0.25;
  const xHalf = 0.5;
  loop.fromTo(harvester, { y: 0 }, { y: -1, duration: yHalf, repeat: GAT_LOOP_S / yHalf - 1, yoyo: true, immediateRender: false }, 0);
  loop.fromTo(harvester, { x: 0 }, { x: 0.6, duration: xHalf, repeat: GAT_LOOP_S / xHalf - 1, yoyo: true, immediateRender: false }, 0);
  turnReel(loop, reel, GAT_LOOP_S / REEL_TURN_S);
  for (const at of LOOP_PUFFS_S) puff(loop, motes, at);
  loop.fromTo(flock, { x: BIRDS_FROM_X, y: 0 }, { x: BIRDS_TO_X, y: -16, duration: GAT_LOOP_S, ease: "none", immediateRender: false }, 0);
  for (const [i, bird] of birds.entries()) {
    const half = BIRDS[i].bob;
    loop.fromTo(bird, { y: 0 }, { y: -3, duration: half, repeat: Math.round(GAT_LOOP_S / half) - 1, yoyo: true, immediateRender: false }, 0);
  }
  return loop;
}

export const motionGat: SceneMotionBuilder = (gsap, overlay) => {
  const parts = pick(overlay, ["harvester", "reel-bg", "reel", "reel-front", "reel-arm"] as const);
  if (!parts) return null;
  // The reel turns behind the rice in front of it and the arm that holds it, over its own
  // background; all of them sit on the harvester, so they shake with it as one.
  const machine = [parts.harvester, parts["reel-bg"], parts.reel, parts["reel-front"], parts["reel-arm"]];
  const motes = drawChaff(overlay.effects);
  const { flock, birds } = drawBirds(overlay.effects);
  // The first frame: no chaff yet, the birds out of view on the left.
  gsap.set(motes.map((m) => m.el), { opacity: 0 });
  gsap.set(flock, { x: BIRDS_FROM_X });
  return {
    intro: buildIntro(gsap, machine, parts.reel, motes),
    loop: buildLoop(gsap, machine, parts.reel, motes, flock, birds),
  };
};
