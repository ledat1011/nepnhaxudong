import { BRAND } from "@/lib/brand/colors";
import {
  draw,
  INK,
  introTimeline,
  loopTimeline,
  pick,
  type Gsap,
  type SceneMotionBuilder,
} from "../scene-kit";

/**
 * Step 4, drying the paddy: the father feeds coal into the brick furnace, and a fan blows the
 * hot air into the drying bed. The coals glow, the fan turns, hot air rises out of the paddy.
 */

export const SAY_LOOP_S = 8;
/** The loop holds a whole number of fan turns, so the seam does not jump. */
const LOOP_TURNS = 5;
/** One turn of the fan, in seconds, once it runs at full speed (1.6 s). */
export const FAN_TURN_S = SAY_LOOP_S / LOOP_TURNS;
/** The fan starts from still: it speeds up for this long, then turns at full speed. */
const FAN_SPIN_UP_S = 0.8;
/**
 * The angle of the spin-up. With a quad ease the speed at its end is 2 x angle / time, which is
 * the full speed (360 / FAN_TURN_S), so the hand-over to the steady turn is smooth.
 */
const FAN_SPIN_UP_DEG = (360 / FAN_TURN_S) * FAN_SPIN_UP_S / 2;

/** The glow of the coals in the furnace opening, and its opacity at rest. */
const GLOW = { cx: 409, cy: 556, rx: 42, ry: 34 } as const;
export const GLOW_REST = 0.3;
/** A soft, uneven flicker between 0.15 and 0.45, back to rest at the end. */
const FLICKER = [0.42, 0.22, 0.4, 0.17, 0.36, GLOW_REST];

/**
 * Hot air rises out of the paddy in the top of the drying bed. The columns are above the arrows
 * drawn in the bottom of the bed (x 652, 800, 947), between the arrows drawn in the top, so a
 * moving wisp never lies over a drawn arrow. The paddy's surface is at about y 392 there.
 */
const WISP_X = [652, 800, 947] as const;
const WISP_BOTTOM_Y = 384;
const WISP_LENGTH = 34;
/** How far a wisp rises; it ends just under the top of the bed (y 291). */
const WISP_RISE = 52;
const WISP_S = 2.4;
/** Each wisp rises once per round; the rounds are staggered by column. */
const WISP_ROUND_S = SAY_LOOP_S / 2;
const WISP_STAGGER_S = 0.8;

let glowIds = 0;

function drawGlow(effects: SVGSVGElement): SVGEllipseElement {
  // An id of its own per overlay: a second overlay must not point at the first one's gradient.
  const id = `say-coal-glow-${++glowIds}`;
  const defs = draw(effects, "defs", {});
  const gradient = draw(defs, "radialGradient", { id });
  draw(gradient, "stop", { offset: "0%", "stop-color": "#FF7A33", "stop-opacity": 1 });
  draw(gradient, "stop", { offset: "60%", "stop-color": "#FF7A33", "stop-opacity": 0.6 });
  draw(gradient, "stop", { offset: "100%", "stop-color": "#FF7A33", "stop-opacity": 0 });
  return draw(effects, "ellipse", { ...GLOW, fill: `url(#${id})`, "data-effect": "say-glow" });
}

function drawWisps(effects: SVGSVGElement): SVGGElement[] {
  const group = draw(effects, "g", { "data-effect": "say-hot-air" });
  return WISP_X.map((x) => {
    const wisp = draw(group, "g", { "data-wisp": x });
    const y0 = WISP_BOTTOM_Y;
    const step = WISP_LENGTH / 4;
    // A short wave: four half bends from the bottom up.
    const d =
      `M${x} ${y0} q-5 ${-step / 2} 0 ${-step} q5 ${-step / 2} 0 ${-step} ` +
      `q-5 ${-step / 2} 0 ${-step} q5 ${-step / 2} 0 ${-step}`;
    const line = { d, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" };
    // An ink edge under the pink line, like the hot-air arrows drawn in the bed.
    draw(wisp, "path", { ...line, stroke: INK, "stroke-width": 5.5 });
    draw(wisp, "path", { ...line, stroke: BRAND.blush, "stroke-width": 3 });
    return wisp;
  });
}

/** The coals glow up, and the fan speeds up from still to full speed. */
function buildIntro(gsap: Gsap, fan: HTMLElement, glow: SVGEllipseElement) {
  const intro = introTimeline(gsap);
  intro.fromTo(glow, { opacity: 0 }, { opacity: 0.45, duration: 1, ease: "sine.inOut" }, 0);
  intro.to(glow, { opacity: GLOW_REST, duration: 0.8, ease: "sine.inOut" }, 1);
  intro.fromTo(fan, { rotation: 0 }, { rotation: FAN_SPIN_UP_DEG, duration: FAN_SPIN_UP_S, ease: "power1.in" }, 0);
  // Ends on a whole turn: the rest pose of the fan.
  intro.to(fan, { rotation: 360, duration: (360 - FAN_SPIN_UP_DEG) / (360 / FAN_TURN_S), ease: "none" }, FAN_SPIN_UP_S);
  return intro;
}

/** The fan turns steadily, the coals flicker, hot air rises in a calm stagger. */
function buildLoop(gsap: Gsap, fan: HTMLElement, glow: SVGEllipseElement, wisps: SVGGElement[]) {
  const loop = loopTimeline(gsap);
  const off = { immediateRender: false };
  loop.fromTo(
    fan,
    { rotation: 0 },
    { rotation: 360, duration: FAN_TURN_S, ease: "none", repeat: LOOP_TURNS - 1, ...off },
    0,
  );
  const flickerStep = SAY_LOOP_S / FLICKER.length;
  let from = GLOW_REST;
  for (const [i, to] of FLICKER.entries()) {
    loop.fromTo(glow, { opacity: from }, { opacity: to, duration: flickerStep, ...off }, i * flickerStep);
    from = to;
  }
  for (let round = 0; round < SAY_LOOP_S / WISP_ROUND_S; round++) {
    for (const [i, wisp] of wisps.entries()) {
      const t = round * WISP_ROUND_S + i * WISP_STAGGER_S;
      loop.fromTo(wisp, { y: 0 }, { y: -WISP_RISE, duration: WISP_S, ease: "sine.out", ...off }, t);
      loop.fromTo(wisp, { opacity: 0 }, { opacity: 0.9, duration: 0.6, ease: "sine.out", ...off }, t);
      // Fades out at the top of the bed.
      loop.fromTo(wisp, { opacity: 0.9 }, { opacity: 0, duration: WISP_S - 0.6, ease: "sine.in", ...off }, t + 0.6);
    }
  }
  return loop;
}

export const motionSay: SceneMotionBuilder = (gsap, overlay) => {
  const parts = pick(overlay, ["fan"]);
  if (!parts) return null;
  const glow = drawGlow(overlay.effects);
  const wisps = drawWisps(overlay.effects);
  // The first frame: cold coals, a still fan, no hot air yet.
  gsap.set(glow, { opacity: 0 });
  gsap.set(wisps, { opacity: 0 });
  return {
    intro: buildIntro(gsap, parts.fan, glow),
    loop: buildLoop(gsap, parts.fan, glow, wisps),
  };
};
