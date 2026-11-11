import { greenRiceCanvas } from "./green-rice";
import { SCENE_LAYERS, STEP2_PICTURES, type SceneLayer } from "./scene-layers";
import type { SceneSlug } from "./scenes";

const SVG_NS = "http://www.w3.org/2000/svg";
/** The scene pictures are 1200 x 675; the effects are drawn in the same units. */
export const SCENE_VIEWBOX = { width: 1200, height: 675 } as const;

/** The moving parts of one scene, laid over its sketch. Built by `buildOverlay`. */
export type Overlay = {
  root: HTMLElement;
  /** The cut layers and the full pictures, by name (`sun`, `night`, `cloud-patch` ...). */
  parts: Record<string, HTMLElement>;
  /** Where the motion code draws the effects (rain, steam ...), in scene units. */
  effects: SVGSVGElement;
};

const FILL = "position:absolute;inset:0;width:100%;height:100%;";

function layerImage(doc: Document, layer: SceneLayer): HTMLImageElement {
  const img = doc.createElement("img");
  img.src = layer.src;
  img.alt = "";
  img.decoding = "async";
  img.dataset.part = layer.name;
  img.style.cssText =
    `position:absolute;left:${layer.left}%;top:${layer.top}%;` +
    `width:${layer.width}%;height:${layer.height}%;` +
    `transform-origin:${layer.originX}% ${layer.originY}%;`;
  return img;
}

function pictureImage(doc: Document, src: string, name: string): HTMLImageElement {
  const img = doc.createElement("img");
  img.src = src;
  img.alt = "";
  img.decoding = "async";
  img.dataset.part = name;
  img.style.cssText = `${FILL}opacity:0;`;
  return img;
}

function loaded(img: HTMLImageElement): Promise<boolean> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    img.addEventListener("load", () => resolve(true), { once: true });
    img.addEventListener("error", () => resolve(false), { once: true });
  });
}

/**
 * Lays the moving parts of a scene over its sketch, in the stage that holds the sketch. The
 * overlay stays hidden until every image of it has loaded; then the motion code shows it. When
 * one image fails, the overlay is removed and the result is null: the scene keeps its still
 * sketch, never a half-built picture.
 *
 * Order, back to front: step 2's green rice and young rice (full pictures over the ripe sketch),
 * the patches (the background behind a part that moves away), the parts, the effects, and last
 * step 2's night picture, which covers everything when the day ends.
 */
export async function buildOverlay(
  stage: HTMLElement,
  slug: SceneSlug,
  doc: Document = document,
): Promise<Overlay | null> {
  const root = doc.createElement("div");
  root.dataset.storyOverlay = slug;
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = `${FILL}pointer-events:none;visibility:hidden;`;
  const parts: Record<string, HTMLElement> = {};
  const images: HTMLImageElement[] = [];

  if (slug === "nang-mua-gio") {
    const sketch = stage.querySelector("img");
    const green = sketch && (await loaded(sketch)) ? greenRiceCanvas(sketch, doc) : null;
    if (green) {
      green.dataset.part = "green";
      green.style.cssText = `${FILL}opacity:0;`;
      root.append(green);
      parts.green = green;
    }
    const young = pictureImage(doc, STEP2_PICTURES.young, "young");
    root.append(young);
    images.push(young);
    parts.young = young;
  }

  for (const layer of SCENE_LAYERS[slug] ?? []) {
    const img = layerImage(doc, layer);
    root.append(img);
    images.push(img);
    parts[layer.name] = img;
  }

  const effects = doc.createElementNS(SVG_NS, "svg");
  effects.setAttribute("viewBox", `0 0 ${SCENE_VIEWBOX.width} ${SCENE_VIEWBOX.height}`);
  effects.setAttribute("preserveAspectRatio", "none");
  effects.setAttribute("focusable", "false");
  effects.dataset.effects = "";
  effects.style.cssText = `${FILL}overflow:hidden;`;
  root.append(effects);

  if (slug === "nang-mua-gio") {
    const night = pictureImage(doc, STEP2_PICTURES.night, "night");
    root.append(night);
    images.push(night);
    parts.night = night;
  }

  stage.append(root);
  const ok = await Promise.all(images.map(loaded));
  if (ok.includes(false) || !root.isConnected) {
    root.remove();
    return null;
  }
  return { root, parts, effects };
}

/** Shows a built overlay. The motion code calls it once the intro's first frame is set. */
export function showOverlay(overlay: Overlay): void {
  overlay.root.style.visibility = "visible";
}
