import { draw, introTimeline, loopTimeline, PAPER, pick, type SceneMotionBuilder } from "../scene-kit";

/**
 * Step 1, transplanting seedlings in a flooded field. The two clouds drift; thin water rings
 * spread from the feet of the three people. The people never move.
 */

const PARTS = ["cloud-left-patch", "cloud-right-patch", "cloud-left", "cloud-right"] as const;

/**
 * The still ripple the sketch draws around each person's feet (centre and radii, scene units),
 * where the ring stays hidden behind the legs and the seedling in hand (`hidden`, x ranges), and
 * from which y the ring's front half passes in front of the feet (`frontY`).
 */
const PEOPLE = [
  { cx: 307, cy: 511, rx: 72, ry: 15, frontY: 513, hidden: [[248, 368]] },
  { cx: 602, cy: 518, rx: 78, ry: 16, frontY: 520, hidden: [[546, 614], [630, 678]] },
  { cx: 892, cy: 511, rx: 72, ry: 14, frontY: 513, hidden: [[832, 948]] },
] as const;

/** A ring grows from a small ring to a bit wider than the sketch's ripple. */
const RING_FROM = 0.45;
const RING_TO = 1.2;
const RING_OPACITY = 0.8;
/** Scaled from 0.45 to 1.2, so the line is about 2.5 wide for most of its life. */
const RING_STROKE = 2.2;

const CLOUD_START = 14;
const LOOP = 9.6;
/** One ring per person every 4.6 to 5 s, the three people in turn. */
const RING_LIFE = 2.2;
const RING_STARTS = [0, 1.4, 2.8];
const RING_SECOND_ROUND = 4.6;

let clipCount = 0;

/**
 * Clips a person's rings so the back half of a ring hides behind the legs, as the sketch's
 * still ripple does. Without it a growing ring would cross the feet.
 */
function feetClip(svg: SVGSVGElement, person: (typeof PEOPLE)[number]): string {
  clipCount += 1;
  const id = `story-cay-ma-feet-${clipCount}`;
  const clip = draw(svg, "clipPath", { id });
  draw(clip, "rect", { x: 0, y: person.frontY, width: 1200, height: 675 - person.frontY });
  let left = 0;
  for (const [from, to] of person.hidden) {
    draw(clip, "rect", { x: left, y: 0, width: from - left, height: 675 });
    left = to;
  }
  draw(clip, "rect", { x: left, y: 0, width: 1200 - left, height: 675 });
  return id;
}

/** One ring: it fades in, grows and fades out, starting at `at` on the timeline. */
function ripple(
  timeline: gsap.core.Timeline,
  ring: SVGEllipseElement,
  at: number,
  life: number,
  immediateRender: boolean,
): void {
  const fadeIn = life * 0.15;
  timeline
    .fromTo(
      ring,
      { scale: RING_FROM },
      { scale: RING_TO, transformOrigin: "50% 50%", duration: life, ease: "power1.out", immediateRender },
      at,
    )
    .fromTo(ring, { opacity: 0 }, { opacity: RING_OPACITY, duration: fadeIn, ease: "none", immediateRender }, at)
    .fromTo(
      ring,
      { opacity: RING_OPACITY },
      { opacity: 0, duration: life - fadeIn, ease: "power1.in", immediateRender: false },
      at + fadeIn,
    );
}

export const motionCayMa: SceneMotionBuilder = (gsap, overlay) => {
  const parts = pick(overlay, PARTS);
  if (!parts) return null;
  const clouds = [
    { el: parts["cloud-left"], side: -1, drift: 8 },
    { el: parts["cloud-right"], side: 1, drift: 6 },
  ];

  // Two rings per person in the intro; the loop reuses the first one.
  const rings = PEOPLE.map((person) => {
    const group = draw(overlay.effects, "g", { "clip-path": `url(#${feetClip(overlay.effects, person)})` });
    const ring = () =>
      draw(group, "ellipse", {
        cx: person.cx,
        cy: person.cy,
        rx: person.rx,
        ry: person.ry,
        fill: "none",
        stroke: PAPER,
        "stroke-width": RING_STROKE,
        opacity: 0,
      });
    return [ring(), ring()] as const;
  });

  // Intro, 2 s: the clouds settle from the side; two rings per person, left to right.
  const intro = introTimeline(gsap);
  for (const cloud of clouds) {
    intro.fromTo(cloud.el, { x: cloud.side * CLOUD_START }, { x: 0, duration: 1.6 }, 0);
  }
  rings.forEach(([first, second], i) => {
    ripple(intro, first, 0.1 + i * 0.25, 1.1, true);
    ripple(intro, second, 0.45 + i * 0.25, 1.0, true);
  });

  // Loop, 9.6 s: the clouds drift with the wind and back to rest; rings now and then.
  const loop = loopTimeline(gsap);
  for (const cloud of clouds) {
    loop
      .fromTo(cloud.el, { x: 0 }, { x: cloud.drift, duration: LOOP / 4, immediateRender: false }, 0)
      .fromTo(
        cloud.el,
        { x: cloud.drift },
        { x: -cloud.drift, duration: LOOP / 2, immediateRender: false },
        LOOP / 4,
      )
      .fromTo(cloud.el, { x: -cloud.drift }, { x: 0, duration: LOOP / 4, immediateRender: false }, (LOOP * 3) / 4);
  }
  rings.forEach(([first], i) => {
    for (const round of [0, RING_SECOND_ROUND]) ripple(loop, first, RING_STARTS[i] + round, RING_LIFE, false);
  });

  return { intro, loop };
};
