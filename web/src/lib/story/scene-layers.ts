import layers from "./scene-layers.json";
import type { SceneSlug } from "./scenes";

/**
 * One moving part of a story scene, cut from the sketch by `brand/tools/cut-story-layers.py`
 * (which also writes `scene-layers.json`; edit `brand/story/layers.json` and run the tool, never
 * the JSON). The box is in percent of the scene; the origin, the turning point, in percent of
 * the box. A name that ends in `-patch` is the background behind a part: it lies under the parts.
 */
export type SceneLayer = {
  name: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  originX: number;
  originY: number;
};

export const SCENE_LAYERS: Partial<Record<SceneSlug, readonly SceneLayer[]>> = layers;

/**
 * The extra pictures of step 2, the size of its day picture: young rice before it and the night
 * after it. The green rice between them is recoloured from the day picture (green-rice.ts).
 */
export const STEP2_PICTURES = {
  young: "/story/canh-2-nang-mua-gio-non.webp",
  night: "/story/canh-2-nang-mua-gio-dem.webp",
} as const;
