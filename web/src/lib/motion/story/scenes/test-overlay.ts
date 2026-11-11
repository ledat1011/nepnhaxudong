import type { Overlay } from "@/lib/story/overlay";
import { SCENE_LAYERS } from "@/lib/story/scene-layers";
import type { SceneSlug } from "@/lib/story/scenes";

/**
 * For tests: the overlay `buildOverlay` would make for a scene, built at once (jsdom loads no
 * images). `without` leaves parts out, to test a scene that misses one.
 */
export function testOverlay(slug: SceneSlug, without: string[] = []): Overlay {
  const root = document.createElement("div");
  const parts: Record<string, HTMLElement> = {};
  const add = (name: string, el: HTMLElement) => {
    if (without.includes(name)) return;
    el.dataset.part = name;
    root.append(el);
    parts[name] = el;
  };
  if (slug === "nang-mua-gio") {
    add("green", document.createElement("canvas"));
    add("young", document.createElement("img"));
  }
  for (const layer of SCENE_LAYERS[slug] ?? []) add(layer.name, document.createElement("img"));
  const effects = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  effects.setAttribute("viewBox", "0 0 1200 675");
  root.append(effects);
  if (slug === "nang-mua-gio") add("night", document.createElement("img"));
  document.body.append(root);
  return { root, parts, effects };
}
