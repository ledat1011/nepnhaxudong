import { SCENE_VIEWBOX } from "@/lib/story/overlay";
import { draw, INK, introTimeline, loopTimeline, pick, type SceneMotionBuilder } from "../scene-kit";

const SVG_NS = "http://www.w3.org/2000/svg";

/** A teardrop about 10 x 16 scene units, point up, centred on (0, 0) like the sketch's drops. */
const DROP_PATH = "M0,-8 C2.5,-3.5 5,-0.5 5,3 A5,5 0 0 1 -5,3 C-5,-0.5 -2.5,-3.5 0,-8 Z";
const DROP_FILL = "#E6E6E6";
const DROP_STROKE = 2.5;
/** Where each drop starts, under the cloud (the sketch's drops lie in x 515..740, y 170..300). */
const DROPS: ReadonlyArray<readonly [number, number]> = [
  [532, 182], [566, 200], [601, 178], [637, 206], [672, 186], [706, 198], [733, 180],
];
/** How far a drop falls, in scene units; the lowest one ends near y 285. */
const DROP_FALL = 78;

const FIREFLY_FILL = "#F2E2B6";
/** Fireflies over the dark field, away from the people and the fireflies of the night picture. */
const FIREFLIES: ReadonlyArray<{ x: number; y: number; r: number; peak: number; at: number }> = [
  { x: 60, y: 330, r: 2.5, peak: 0.85, at: 0 },
  { x: 545, y: 372, r: 2, peak: 0.8, at: 3.1 },
  { x: 612, y: 298, r: 3, peak: 0.9, at: 1.2 },
  { x: 725, y: 402, r: 2.5, peak: 0.8, at: 4.6 },
  { x: 868, y: 318, r: 2, peak: 0.85, at: 2.3 },
  { x: 962, y: 372, r: 3, peak: 0.9, at: 5.6 },
  { x: 1095, y: 302, r: 2.5, peak: 0.85, at: 0.6 },
  { x: 1165, y: 398, r: 2, peak: 0.8, at: 3.8 },
];
/** One glow: fade in, then out, over twice this time. The last glow ends at 5.6 + 2.4 = 8 s. */
const GLOW_S = 1.2;

/**
 * Step 2: the rice grows through sun, rain and wind. The intro (about 7 s) starts on the young
 * rice under the sun, brings the cloud and its rain, then the wind, turns the young rice green
 * and then ripe gold, and ends at night. The loop lets fireflies glow over the night field.
 * The green rice is optional: without it the young rice fades straight to the ripe sketch.
 */
export const motionNangMuaGio: SceneMotionBuilder = (gsap, overlay) => {
  const parts = pick(overlay, [
    "young", "sun", "cloud", "wind", "rain", "night", "sun-patch", "cloud-patch", "wind-patch", "rain-patch",
  ] as const);
  if (!parts) return null;
  const { young, sun, cloud, wind, rain, night } = parts;
  const green = overlay.parts.green ?? null;
  const doc = overlay.root.ownerDocument;

  const drops = DROPS.map(([x, y]) => {
    const drop = draw(overlay.effects, "path", {
      d: DROP_PATH,
      fill: DROP_FILL,
      stroke: INK,
      "stroke-width": DROP_STROKE,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    });
    gsap.set(drop, { x, y, opacity: 0 });
    return { drop, y };
  });

  // The fireflies must glow over the night picture, which covers the effects svg: so they get
  // their own svg, the last child of the overlay.
  const sky = doc.createElementNS(SVG_NS, "svg");
  sky.setAttribute("viewBox", `0 0 ${SCENE_VIEWBOX.width} ${SCENE_VIEWBOX.height}`);
  sky.setAttribute("preserveAspectRatio", "none");
  sky.setAttribute("focusable", "false");
  sky.dataset.fireflies = "";
  sky.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:hidden;";
  overlay.root.append(sky);
  const fireflies = FIREFLIES.map((f) => ({ ...f, dot: draw(sky, "circle", { cx: f.x, cy: f.y, r: f.r, fill: FIREFLY_FILL }) }));

  // The first frame: young rice under a slightly small sun, an empty sky, no night yet. A percent
  // `x` is a share of the layer's own width, so the slide is the same at every screen size:
  // 21 % of the cloud is about 60 scene units, 15 % of the wind about 30.
  gsap.set(young, { opacity: 1 });
  if (green) gsap.set(green, { opacity: 1 });
  gsap.set(sun, { scale: 0.94, rotation: -6 });
  gsap.set(cloud, { x: "-21%", opacity: 0 });
  gsap.set(wind, { x: "-15%", opacity: 0 });
  // The drops drawn in the pictures: their patch hides them until the cloud has come.
  gsap.set(rain, { opacity: 0 });
  gsap.set(night, { opacity: 0 });
  gsap.set(fireflies.map((f) => f.dot), { opacity: 0 });

  const intro = introTimeline(gsap);
  // The sun swells a little and its rays turn, then it settles.
  intro.to(sun, { scale: 1.05, rotation: 3, duration: 1.0, ease: "sine.out" }, 0);
  intro.to(sun, { scale: 1, rotation: 0, duration: 0.8, ease: "sine.inOut" }, 1.0);
  // The cloud slides in from the left, and it rains for about 2 s.
  intro.to(cloud, { x: "0%", opacity: 1, duration: 1.2 }, 0.6);
  intro.to(rain, { opacity: 1, duration: 0.3 }, 1.8);
  drops.forEach(({ drop, y }, i) => {
    const at = 1.6 + i * 0.1;
    // Each drop falls twice; `repeat` starts the fall again from the top.
    intro.to(drop, { y: y + DROP_FALL, duration: 0.75, ease: "power1.in", repeat: 1 }, at);
    // In, out, in, out: one fade in and out per fall, ending invisible.
    intro.to(drop, { opacity: 1, duration: 0.375, ease: "sine.inOut", yoyo: true, repeat: 3 }, at);
  });
  // The wind sweeps in.
  intro.to(wind, { x: "0%", opacity: 1, duration: 1.2 }, 2.2);
  // Young rice to green rice, green rice to the ripe gold of the sketch.
  intro.to(young, { opacity: 0, duration: 1.1, ease: "sine.inOut" }, 3.0);
  if (green) intro.to(green, { opacity: 0, duration: 1.1, ease: "sine.inOut" }, 4.4);
  // The day ends.
  intro.to(night, { opacity: 1, duration: 1.1, ease: "sine.inOut" }, 5.9);

  const loop = loopTimeline(gsap);
  for (const { dot, peak, at } of fireflies) {
    // A glow rises a few units and sinks back, so each one starts and ends dark at rest.
    loop.to(dot, { opacity: peak, y: -5, duration: GLOW_S, yoyo: true, repeat: 1 }, at);
  }

  return { intro, loop };
};
