import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { webpSize } from "@/lib/test/webp-size";
import { STORY_SCENES } from "./scenes";
import { SCENE_LAYERS, STEP2_PICTURES } from "./scene-layers";

/** The layers are cut at 1200 x 675 (brand/tools/cut-story-layers.py), larger than the picture. */
const LAYER_W = 1200;
const LAYER_H = 675;
const LAYER_MAX_BYTES = 40 * 1024;
const SCENE_LAYERS_MAX_BYTES = 120 * 1024;
const PICTURE_MAX_BYTES = 120 * 1024;
const file = (src: string) => join(process.cwd(), "public", src);

describe("scene layers", () => {
  it("lists only known scenes", () => {
    const slugs = new Set(STORY_SCENES.map((s) => s.slug));
    for (const slug of Object.keys(SCENE_LAYERS)) expect(slugs.has(slug as never), slug).toBe(true);
  });

  it.each(Object.entries(SCENE_LAYERS))("has real, small files that fit their boxes in %s", (_slug, layers) => {
    let total = 0;
    for (const layer of layers) {
      const path = file(layer.src);
      expect(existsSync(path), layer.src).toBe(true);
      const bytes = statSync(path).size;
      expect(bytes, layer.src).toBeLessThan(LAYER_MAX_BYTES);
      total += bytes;
      const [w, h] = webpSize(path);
      expect(Math.abs(w - (layer.width * LAYER_W) / 100), layer.src).toBeLessThanOrEqual(1);
      expect(Math.abs(h - (layer.height * LAYER_H) / 100), layer.src).toBeLessThanOrEqual(1);
      expect(layer.left + layer.width, layer.src).toBeLessThanOrEqual(100.01);
      expect(layer.top + layer.height, layer.src).toBeLessThanOrEqual(100.01);
    }
    expect(total).toBeLessThan(SCENE_LAYERS_MAX_BYTES);
  });

  it("lays every patch under every part", () => {
    for (const layers of Object.values(SCENE_LAYERS)) {
      const lastPatch = layers.findLastIndex((l) => l.name.endsWith("-patch"));
      const firstPart = layers.findIndex((l) => !l.name.endsWith("-patch"));
      if (lastPatch !== -1) expect(lastPatch).toBeLessThan(firstPart);
    }
  });

  it("has the scene pictures at their stated size, 960 x 540 and small", () => {
    for (const scene of STORY_SCENES) {
      expect([scene.width, scene.height]).toEqual([960, 540]);
      expect(webpSize(file(scene.src)), scene.src).toEqual([scene.width, scene.height]);
      expect(statSync(file(scene.src)).size, scene.src).toBeLessThan(PICTURE_MAX_BYTES);
    }
  });

  it("has the young-rice and night pictures of step 2, the size of the day picture", () => {
    const day = STORY_SCENES.find((s) => s.slug === "nang-mua-gio")!;
    for (const src of Object.values(STEP2_PICTURES)) {
      expect(webpSize(file(src)), src).toEqual([day.width, day.height]);
      expect(statSync(file(src)).size, src).toBeLessThan(PICTURE_MAX_BYTES);
    }
  });
});
