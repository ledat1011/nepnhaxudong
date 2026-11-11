import { BRAND } from "@/lib/brand/colors";
import type { Overlay } from "@/lib/story/overlay";
import type { GsapModules } from "../load-gsap";

/**
 * Shared pieces of the eight scene motions (`scenes/*.ts`). A scene motion gets the overlay of
 * its scene (the cut layers by name, and an svg for effects in 1200 x 675 scene units) and returns
 * its intro and its loop. Rules every scene keeps:
 * - Only `x`, `y`, `rotation`, `scale` and `opacity` move (no layout, no filters).
 * - The intro is paused; its first frame is the start of the story, its last frame the rest pose:
 *   every cut layer exactly where the sketch has it. Step 2 ends at night.
 * - The loop is paused, repeats for ever (`repeat: -1`), starts and ends at the rest pose so its
 *   seam does not jump, and is light: few elements, slow moves. It runs only after the intro,
 *   only while the scene is on screen and only while the visitor has not paused the motion.
 * - People never move. Machines only shake or turn in place.
 * - A scene that misses a part it needs returns null, and the sketch stays still.
 */

export type Gsap = GsapModules["gsap"];
export type SceneMotion = { intro: gsap.core.Timeline; loop: gsap.core.Timeline | null };
export type SceneMotionBuilder = (gsap: Gsap, overlay: Overlay) => SceneMotion | null;

export const introTimeline = (gsap: Gsap) =>
  gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
export const loopTimeline = (gsap: Gsap) =>
  gsap.timeline({ paused: true, repeat: -1, defaults: { ease: "sine.inOut" } });

/** The named parts of the overlay, or null when one is missing. */
export function pick<const N extends string>(overlay: Overlay, names: readonly N[]): Record<N, HTMLElement> | null {
  const found = {} as Record<N, HTMLElement>;
  for (const name of names) {
    const el = overlay.parts[name];
    if (!el) return null;
    found[name] = el;
  }
  return found;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Adds an svg element with these attributes to `parent` and returns it. */
export function draw<K extends keyof SVGElementTagNameMap>(
  parent: SVGElement,
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = parent.ownerDocument.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  parent.append(el);
  return el;
}

/** Colours of the drawn effects: the ink of the sketches and the brand colours. */
export const INK = BRAND.earth;
export const PAPER = "#FFFFFF";
export const GRAIN = BRAND.grain;
export const RICE_WHITE = BRAND.rice;
/** The stroke of drawn effects, close to the brush lines of the sketches at 1200 px. */
export const INK_STROKE = 3;
