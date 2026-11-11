import {
  draw,
  GRAIN,
  INK,
  introTimeline,
  loopTimeline,
  RICE_WHITE,
  type SceneMotionBuilder,
} from "../scene-kit";

/*
 * Step 5, milling. The sketch has no cut layers here: the motion is drawn in the effects svg.
 * White rice grains fall down the pale chute under the mill into the pink bin, and husk flakes
 * puff out of the gold pipe, up and to the right. Places are in scene units (1200 x 675).
 */

/** The pale chute: from under the mill box to the top of the pink bin. */
export const CHUTE = { top: { x: 700, y: 342 }, bottom: { x: 707, y: 429 } } as const;
/** The open end of the gold husk pipe. */
export const HUSK_MOUTH = { x: 917, y: 239 } as const;

/** One grain goes down the whole chute in this time. */
const TRIP_S = 1.5;
/** Small sideways offsets, so the grains do not fall in one line. */
const GRAIN_SHIFT = [-3, 2, -1, 3, 0];
/** Where a trip fades in and out (0 = top of the chute, 1 = top of the bin). */
const TRIP_FADE = [
  { at: 0, opacity: 0 },
  { at: 0.12, opacity: 1 },
  { at: 0.85, opacity: 1 },
  { at: 1, opacity: 0 },
];

const HUSK_FLIGHT_S = 1.4;
const HUSK_STAGGER_S = 0.15;
const HUSK_FADE_IN_S = 0.2;
const HUSK_FADE_OUT_S = 0.6;
/** Where each flake of a puff ends, from the pipe's mouth, and how far it turns. */
const PUFFS = [
  [
    { dx: 38, dy: -72, turn: 70 },
    { dx: 72, dy: -42, turn: -60 },
    { dx: 24, dy: -112, turn: 110 },
  ],
  [
    { dx: 56, dy: -92, turn: -90 },
    { dx: 86, dy: -60, turn: 80 },
    { dx: 34, dy: -52, turn: 60 },
  ],
] as const;
/** The flakes leave the pipe pointing along it, up and to the right. */
const HUSK_START_ROTATION = -35;

/** The intro: the stream starts and one puff comes out. It must be at least one trip long. */
export const XAY_XAT_INTRO_S = 2;
/** The loop: a whole number of trips, so the stream joins itself; two puffs. */
export const XAY_XAT_LOOP_S = 4 * TRIP_S;
const INTRO_PUFF_AT = 0.2;
const LOOP_PUFFS_AT = [1.4, 4.2];

type Timeline = gsap.core.Timeline;

function grainState(index: number, s: number) {
  let opacity = 1;
  for (let i = 1; i < TRIP_FADE.length; i++) {
    const a = TRIP_FADE[i - 1];
    const b = TRIP_FADE[i];
    if (s <= b.at) {
      opacity = a.opacity + ((s - a.at) / (b.at - a.at)) * (b.opacity - a.opacity);
      break;
    }
  }
  return {
    x: CHUTE.top.x + s * (CHUTE.bottom.x - CHUTE.top.x) + GRAIN_SHIFT[index % GRAIN_SHIFT.length],
    y: CHUTE.top.y + s * (CHUTE.bottom.y - CHUTE.top.y),
    opacity,
  };
}

/**
 * Adds the grain stream between the stream times `from` and `to` to `timeline`, at timeline time
 * 0 for `from`. Grain `index` starts a trip every TRIP_S, shifted by its share of the trip, so
 * the stream is the same at any two times one trip apart. With `onlyNewTrips`, the trips that
 * started before stream time 0 are left out: the chute starts empty.
 */
function addStream(timeline: Timeline, grains: SVGElement[], from: number, to: number, onlyNewTrips: boolean) {
  grains.forEach((grain, index) => {
    const shift = (index / grains.length) * TRIP_S;
    const first = Math.floor((from - shift) / TRIP_S);
    for (let k = first; k * TRIP_S + shift < to; k++) {
      const start = k * TRIP_S + shift;
      if (onlyNewTrips && start < 0) continue;
      const pieceFrom = Math.max(start, from);
      const pieceTo = Math.min(start + TRIP_S, to);
      if (pieceTo - pieceFrom < 1e-6) continue;
      const sFrom = (pieceFrom - start) / TRIP_S;
      const sTo = (pieceTo - start) / TRIP_S;
      // A set at the start of each piece, so a piece never depends on the one before it.
      timeline.set(grain, grainState(index, sFrom), pieceFrom - from);
      for (let i = 1; i < TRIP_FADE.length; i++) {
        const a = Math.max(TRIP_FADE[i - 1].at, sFrom);
        const b = Math.min(TRIP_FADE[i].at, sTo);
        if (b - a < 1e-6) continue;
        timeline.to(
          grain,
          { ...grainState(index, b), duration: (b - a) * TRIP_S, ease: "none" },
          start + a * TRIP_S - from,
        );
      }
    }
  });
}

/** One puff of husk: the flakes leave the mouth one after the other, turn and fade. */
function addPuff(timeline: Timeline, flakes: SVGElement[], at: number, puff: (typeof PUFFS)[number]) {
  flakes.forEach((flake, i) => {
    const t = at + i * HUSK_STAGGER_S;
    const { dx, dy, turn } = puff[i % puff.length];
    timeline
      .set(flake, { x: HUSK_MOUTH.x, y: HUSK_MOUTH.y, rotation: HUSK_START_ROTATION, opacity: 0 }, t)
      .to(flake, { opacity: 1, duration: HUSK_FADE_IN_S, ease: "none" }, t)
      .to(
        flake,
        {
          x: HUSK_MOUTH.x + dx,
          y: HUSK_MOUTH.y + dy,
          rotation: HUSK_START_ROTATION + turn,
          duration: HUSK_FLIGHT_S,
          ease: "power1.out",
        },
        t,
      )
      .to(flake, { opacity: 0, duration: HUSK_FADE_OUT_S, ease: "sine.in" }, t + HUSK_FLIGHT_S - HUSK_FADE_OUT_S);
  });
}

function drawGrain(parent: SVGElement): SVGElement {
  // Drawn round (0, 0): GSAP's x and y put it on the chute.
  const grain = draw(parent, "ellipse", {
    rx: 2.5,
    ry: 4,
    fill: RICE_WHITE,
    stroke: INK,
    "stroke-width": 1.2,
  });
  grain.dataset.effect = "rice-grain";
  return grain;
}

function drawFlake(parent: SVGElement): SVGElement {
  // Like the still flakes of the sketch: a gold oval with a dark line along its middle.
  const flake = draw(parent, "g", {});
  flake.dataset.effect = "husk";
  draw(flake, "ellipse", { rx: 10, ry: 3.6, fill: GRAIN, stroke: INK, "stroke-width": 1.6 });
  draw(flake, "path", {
    d: "M -6 0.7 Q 0 2 6 0.7",
    fill: "none",
    stroke: INK,
    "stroke-width": 1.2,
    "stroke-linecap": "round",
  });
  return flake;
}

/**
 * Intro (2 s): the mill starts. The chute is empty, the first grains fall into the bin one
 * after the other, and the first puff of husk comes out of the pipe.
 * Loop (6 s): the grains keep falling in a calm, even stream (one every 0.3 s), and a puff of
 * three flakes comes out at 1.4 s and at 4.2 s. The loop starts where the intro ends.
 * Eight drawn elements move: five grains and three flakes.
 */
export const motionXayXat: SceneMotionBuilder = (gsap, overlay) => {
  const layer = draw(overlay.effects, "g", {});
  layer.dataset.effect = "milling";
  const grains = GRAIN_SHIFT.map(() => drawGrain(layer));
  const flakes = PUFFS[0].map(() => drawFlake(layer));

  const intro = introTimeline(gsap);
  // The first frame: nothing falls yet, no husk. Flakes turn round their own middle.
  intro.set(grains, { opacity: 0, immediateRender: true }, 0);
  intro.set(flakes, { opacity: 0, transformOrigin: "50% 50%", immediateRender: true }, 0);
  addStream(intro, grains, 0, XAY_XAT_INTRO_S, true);
  addPuff(intro, flakes, INTRO_PUFF_AT, PUFFS[0]);

  // The loop goes on with the stream from where the intro left it.
  const loop = loopTimeline(gsap);
  addStream(loop, grains, XAY_XAT_INTRO_S, XAY_XAT_INTRO_S + XAY_XAT_LOOP_S, false);
  LOOP_PUFFS_AT.forEach((at, i) => addPuff(loop, flakes, at, PUFFS[(i + 1) % PUFFS.length]));

  return { intro, loop };
};
