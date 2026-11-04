import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SCENE_SLUGS } from "../../../scripts/story-scenes.mjs";

/** The data-part groups the motion code (Task 11) looks for in each finished scene. */
const SCENE_PARTS: Record<string, readonly string[]> = {
  "cay-ma": ["mother", "farmer", "seedling", "ripple"],
  "nang-mua-gio": ["sun", "cloud", "wind", "rice", "rice-green", "rice-gold", "rain", "rice-sway"],
  gat: ["harvester", "crop", "sack", "driver", "brother", "reel"],
  say: ["air", "paddy", "father", "fan-blades", "coals"],
  "xay-xat": ["brother", "pour-sack", "husk", "rice-flow", "elevator-grain"],
  "dong-goi": ["mother", "lid", "stack-bag"],
  "den-tay-khach": ["truck", "shelf-bag", "mother", "customer", "handover-bag", "gift", "wheel"],
  "mam-com": ["dish", "steam"],
};

/** The groups of the bag drawing that buildBagTimeline (lib/motion/product-bag.ts) needs. */
const BAG_PARTS = ["puffy", "brick", "grains", "wrinkles", "air", "seal", "label", "tray"];
const HIDDEN_BAG_PARTS = ["puffy", "grains", "air"];
const DISHES = ["xoi", "banh-chung", "che", "ruou-nep"];

function load(slug: string): Document {
  const index = SCENE_SLUGS.indexOf(slug);
  const svg = readFileSync(`public/story/canh-${index + 1}-${slug}.svg`, "utf8");
  return new DOMParser().parseFromString(svg, "image/svg+xml");
}

const parts = (doc: Document, name: string) => Array.from(doc.querySelectorAll(`[data-part="${name}"]`));

describe("story scene parts", () => {
  it("covers every scene", () => {
    expect(Object.keys(SCENE_PARTS)).toEqual(SCENE_SLUGS);
  });

  it.each(SCENE_SLUGS)("%s has every data-part group", (slug) => {
    const doc = load(slug);
    expect(doc.querySelector("parsererror")).toBeNull();
    const missing = SCENE_PARTS[slug].filter((name) => parts(doc, name).length === 0);
    expect(missing).toEqual([]);
  });

  it.each(SCENE_SLUGS)("%s shows its final frame (only rice-green is hidden)", (slug) => {
    const hidden = Array.from(load(slug).querySelectorAll("[data-part][opacity='0']"));
    expect(hidden.map((el) => el.getAttribute("data-part")).filter((name) => name !== "rice-green")).toEqual([]);
  });

  it.each(SCENE_SLUGS)("%s has the shared road at y 560", (slug) => {
    const road = parts(load(slug), "road");
    expect(road).toHaveLength(1);
    expect(road[0].getAttribute("transform")).toBe("translate(0 560)");
  });

  it("cay-ma has two farmers in one row, the second one mirrored", () => {
    const farmers = parts(load("cay-ma"), "farmer");
    expect(farmers).toHaveLength(2);
    expect(farmers[1].parentElement?.getAttribute("transform")).toContain("scale(-1 1)");
  });

  it("nang-mua-gio starts green under gold: every rice-green layer is hidden", () => {
    const doc = load("nang-mua-gio");
    const green = parts(doc, "rice-green");
    expect(green.length).toBeGreaterThan(0);
    expect(green.every((el) => el.getAttribute("opacity") === "0")).toBe(true);
    expect(parts(doc, "rice-gold").some((el) => el.getAttribute("opacity") === "0")).toBe(false);
  });

  it("gat has the driver inside the harvester", () => {
    expect(load("gat").querySelector('[data-part="harvester"] [data-part="driver"]')).not.toBeNull();
  });

  it("dong-goi has the bag groups once each, in their final frame", () => {
    const doc = load("dong-goi");
    for (const name of BAG_PARTS) expect(doc.querySelectorAll(`[data-bag="${name}"]`)).toHaveLength(1);
    for (const name of HIDDEN_BAG_PARTS) {
      expect(doc.querySelector(`[data-bag="${name}"]`)?.getAttribute("opacity")).toBe("0");
    }
  });

  it("mam-com has exactly four dishes, in order", () => {
    const dishes = parts(load("mam-com"), "dish");
    expect(dishes.map((el) => el.getAttribute("data-dish"))).toEqual(DISHES);
  });
});
