import { MASCOT_PIVOTS } from "@/components/brand/generated/mascot";
import type { MotionSetup } from "./load-gsap";
import { getLoopController } from "./loops";

/** One cycle of the hero loop. Every motion in it repeats a whole number of times in this time. */
export const HERO_CYCLE_S = 60;
/** Laps of each cloud across the sky in one cycle. */
export const CLOUD_LAPS = [1, 2, 1] as const;
/** Swings of the rice in one cycle (4 s each). */
export const GUST_SWINGS = 15;
export const GUST_MAX_DEG = 4;
/** How much later each group to the right swings, as a part of one swing. */
export const GUST_PHASE_STEP = 0.12;
export const SUN_BOBS = 6;
export const SUN_BOB_PX = 4;
export const MASCOT_RICE_SKEW_DEG = 2;

export type HeroFrame = {
  rays: number;
  sunY: number;
  clouds: number[];
  gusts: number[];
  mascotRiceSkew: number;
};

const wrap01 = (x: number) => x - Math.floor(x);

/** The offset of a cloud (as a part of the strip) from its static place, `t` = part of the cycle. */
export function cloudOffset(t: number, start: number, laps: number): number {
  return wrap01(start + laps * t) - start;
}

/** All values of the loop at `t` (the part of the cycle that has passed, 0 to 1). */
export function heroFrame(t: number, starts: readonly number[], gustCount: number): HeroFrame {
  const swing = (phase: number) => Math.sin(2 * Math.PI * (GUST_SWINGS * t - phase));
  return {
    rays: 360 * t,
    sunY: SUN_BOB_PX * Math.sin(2 * Math.PI * SUN_BOBS * t),
    clouds: starts.map((start, i) => cloudOffset(t, start, CLOUD_LAPS[i % CLOUD_LAPS.length])),
    gusts: Array.from({ length: gustCount }, (_, i) => GUST_MAX_DEG * swing(i * GUST_PHASE_STEP)),
    mascotRiceSkew: MASCOT_RICE_SKEW_DEG * swing((GUST_PHASE_STEP * (gustCount - 1)) / 2),
  };
}

type Setter = (value: number) => void;

/**
 * Moves the hero sky, sun and rice in one 60 s loop, and sways the mascot's rice bundle with the
 * same wind. One paused tween drives a proxy `t`; the loop controller plays it only while the
 * hero is on screen and the visitor has not paused the motion.
 */
export const setupHeroScene: MotionSetup = ({ gsap, ScrollTrigger }, root) => {
  const section = root.querySelector<HTMLElement>("[data-hero-scene]");
  if (!section) return;

  const clouds = [...section.querySelectorAll<SVGElement>("[data-hero-cloud]")];
  const gusts = [...section.querySelectorAll<SVGElement>("[data-hero-gust]")];
  const sun = section.querySelector<SVGElement>("[data-hero-sun]");
  const rays = section.querySelector<SVGElement>("[data-hero-sun-rays]");
  const rice = root.querySelector<SVGElement>("svg[data-mascot] #rice");

  // Same pivot as setupMascot: it turns the rice with `rotation`, this adds `skewX` only.
  if (rice) {
    gsap.set(rice, {
      svgOrigin: `${MASCOT_PIVOTS.rice.x} ${MASCOT_PIVOTS.rice.y}`,
      skewX: 0,
    });
  }
  gsap.set(gusts, { transformOrigin: "50% 100%" });
  if (rays) gsap.set(rays, { transformOrigin: "50% 50%" });

  const cloudX: Setter[] = clouds.map((c) => gsap.quickSetter(c, "x", "px") as Setter);
  const gustRotation: Setter[] = gusts.map((g) => gsap.quickSetter(g, "rotation", "deg") as Setter);
  const raysRotation = rays ? (gsap.quickSetter(rays, "rotation", "deg") as Setter) : null;
  const sunY = sun ? (gsap.quickSetter(sun, "y", "px") as Setter) : null;
  const riceSkew = rice ? (gsap.quickSetter(rice, "skewX", "deg") as Setter) : null;

  // A cloud moves by `offset * (W + w)`, W = the strip width and w = the cloud width. Its `left`
  // is a part of W, so the start used here is the cloud's static place on that same scale: then
  // the jump happens exactly when the cloud is outside the strip on both sides.
  // The static place is the cloud's own `left` (a percent of the strip), written by HeroScene.
  const staticLeft = (cloud: SVGElement) => {
    const percent = Number.parseFloat((cloud as SVGElement & ElementCSSInlineStyle).style.left);
    return Number.isFinite(percent) ? percent / 100 : 0;
  };
  let starts: number[] = clouds.map(staticLeft);
  let spans: number[] = clouds.map(() => 0);
  const measure = () => {
    const next: number[] = [];
    const nextSpans: number[] = [];
    clouds.forEach((cloud) => {
      const strip = cloud.parentElement?.clientWidth ?? 0;
      const width = cloud.getBoundingClientRect().width;
      const span = strip + width;
      const left = staticLeft(cloud);
      next.push(span > 0 ? (left * strip + width) / span : left);
      nextSpans.push(span);
    });
    starts = next;
    spans = nextSpans;
  };
  measure();
  ScrollTrigger.addEventListener("refresh", measure);

  const apply = (frame: HeroFrame) => {
    frame.clouds.forEach((offset, i) => cloudX[i]?.(offset * spans[i]));
    frame.gusts.forEach((deg, i) => gustRotation[i]?.(deg));
    raysRotation?.(frame.rays);
    sunY?.(frame.sunY);
    riceSkew?.(frame.mascotRiceSkew);
  };

  const proxy = { t: 0 };
  const tween = gsap.to(proxy, {
    t: 1,
    duration: HERO_CYCLE_S,
    ease: "none",
    repeat: -1,
    paused: true,
    onUpdate: () => apply(heroFrame(proxy.t, starts, gusts.length)),
  });

  const entry = getLoopController().add(tween);
  const trigger = ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => entry.setVisible(self.isActive),
  });

  return () => {
    entry.remove();
    trigger.kill();
    ScrollTrigger.removeEventListener("refresh", measure);
    tween.kill();
    // Put everything back at its static place.
    spans = spans.map(() => 0);
    apply({
      rays: 0,
      sunY: 0,
      clouds: clouds.map(() => 0),
      gusts: gusts.map(() => 0),
      mascotRiceSkew: 0,
    });
  };
};
