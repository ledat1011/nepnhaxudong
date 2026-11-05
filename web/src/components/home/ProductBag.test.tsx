import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ILLUSTRATION_PALETTE } from "@/lib/brand/colors";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { GalleryImage } from "./Gallery";
import { BAG_FRONT, BAG_SIDE_DEPTH, ProductBag } from "./ProductBag";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const PHOTOS: GalleryImage[] = [1, 2].map((n) => ({
  src: `https://cdn.example.com/${n}.webp`,
  width: 800,
  height: 600,
  alt: `Ảnh số ${n}`,
}));

const viDict = getDictionary("vi");
const enDict = getDictionary("en");

/** The parts the motion code (Task 6) moves. The static markup is the final frame. */
const PARTS = ["puffy", "brick", "grains", "wrinkles", "air", "seal", "label", "tray"];

function renderBag(dict = viDict, images: GalleryImage[] = []) {
  return render(<ProductBag dict={dict} images={images} />);
}

function part(container: HTMLElement, name: string) {
  return container.querySelector(`[data-bag="${name}"]`);
}

describe("ProductBag", () => {
  it("is a figure with every part of the bag drawing, once each", () => {
    const { container } = renderBag();
    const figure = container.querySelector("figure[data-product-bag]");
    expect(figure).not.toBeNull();
    expect(figure?.querySelector("svg")).toHaveAttribute("viewBox", "0 0 400 300");
    for (const name of PARTS) {
      expect(container.querySelectorAll(`svg [data-bag="${name}"]`), name).toHaveLength(1);
    }
  });

  it("is drawn slim and upright: the front is about 1.7 times as tall as wide, the side about 1/4", () => {
    expect(BAG_FRONT.height / BAG_FRONT.width).toBeGreaterThan(1.6);
    expect(BAG_FRONT.height / BAG_FRONT.width).toBeLessThan(1.8);
    expect(BAG_SIDE_DEPTH / BAG_FRONT.width).toBeGreaterThan(0.2);
    expect(BAG_SIDE_DEPTH / BAG_FRONT.width).toBeLessThan(0.3);
  });

  it("is the first item of the product gallery, with the notes under the gallery box", () => {
    const { container } = renderBag();
    const figure = container.querySelector("figure[data-product-bag]") as HTMLElement;
    const svg = figure.querySelector("svg") as SVGElement;
    const notes = figure.querySelector("ul:has([data-bag-note])") as HTMLElement;
    expect(svg.closest(".bg-straw")).not.toBeNull();
    expect(svg.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // With no photos there is no placeholder and no thumbnail row.
    expect(figure.querySelector("[role='img']")).toBeNull();
    expect(figure.querySelectorAll("button")).toHaveLength(0);
  });

  it("keeps each part once when photos follow it, with a plain thumbnail of the drawing first", () => {
    const { container } = renderBag(viDict, PHOTOS);
    for (const name of PARTS) {
      expect(container.querySelectorAll(`[data-bag="${name}"]`), name).toHaveLength(1);
    }
    const thumbs = container.querySelectorAll("figure li > button");
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0].querySelector("svg")).not.toBeNull();
    expect(thumbs[0]).toHaveAccessibleName(viDict.gallery.bag);
  });

  it("draws the final frame: a square block with a label, no puffy bag, no falling grains, no air", () => {
    const { container } = renderBag();
    for (const name of ["puffy", "grains", "air"]) {
      expect(part(container, name), name).toHaveAttribute("opacity", "0");
    }
    for (const name of ["brick", "wrinkles", "seal", "label", "tray"]) {
      expect(part(container, name)?.getAttribute("opacity") ?? "1", name).not.toBe("0");
    }
  });

  it("has about 10 falling grains", () => {
    const { container } = renderBag();
    const grains = part(container, "grains")?.children.length ?? 0;
    expect(grains).toBeGreaterThanOrEqual(8);
    expect(grains).toBeLessThanOrEqual(12);
  });

  it("prints the packaging text on the label, the same in both languages", () => {
    for (const dict of [viDict, enDict]) {
      const { container, unmount } = renderBag(dict);
      const label = part(container, "label")?.textContent ?? "";
      expect(label).toContain("GẠO NẾP CÁI HOA VÀNG");
      expect(label).toContain("DUY TÂN");
      expect(label).toContain("2KG");
      unmount();
    }
  });

  it("shows the 3 notes as HTML text, in order, in Vietnamese", () => {
    const { container } = renderBag(viDict);
    const notes = [...container.querySelectorAll("ul [data-bag-note]")].map((n) => n.textContent);
    expect(notes).toEqual([
      "Túi trong: nhìn rõ từng hạt gạo",
      "Hút chân không: gạo giữ khô và thơm lâu",
      "Túi gọn: dễ cất, dễ làm quà",
    ]);
  });

  it("shows the 3 notes in English", () => {
    const { container } = renderBag(enDict);
    const notes = [...container.querySelectorAll("ul [data-bag-note]")].map((n) => n.textContent);
    expect(notes).toEqual([
      "Clear bag: you can see every grain",
      "Vacuum packed: the rice stays dry and fragrant for longer",
      "Compact bag: easy to store and to give",
    ]);
  });

  it("keeps the notes outside the drawing", () => {
    const { container } = renderBag();
    expect(container.querySelectorAll("svg [data-bag-note]")).toHaveLength(0);
  });

  it("is decorative", () => {
    const { container } = renderBag();
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("uses only palette colors", () => {
    const { container } = renderBag();
    const used = new Set<string>();
    for (const el of container.querySelectorAll("svg, svg *")) {
      for (const name of ["fill", "stroke", "stop-color", "color"]) {
        const value = el.getAttribute(name);
        if (value === null || value === "none" || value.startsWith("url(")) continue;
        used.add(value.toLowerCase());
      }
    }
    expect(used.size).toBeGreaterThan(0);
    for (const color of used) expect(ILLUSTRATION_PALETTE.has(color), color).toBe(true);
  });

  it("refers to nothing outside itself, so the drawing can be copied as one file", () => {
    const { container } = renderBag();
    for (const el of container.querySelectorAll("svg, svg *")) {
      for (const { name, value } of el.attributes) {
        if (name === "href" || name === "xlink:href") expect(value, name).toMatch(/^#/);
        for (const [, target] of value.matchAll(/url\(([^)]*)\)/g)) expect(target).toMatch(/^#/);
      }
    }
  });

  it("does not copy a phone number from the real bag", () => {
    const { container } = renderBag();
    const text = container.querySelector("svg")?.textContent ?? "";
    expect(text).not.toMatch(/\d{4}[.\s]?\d{3}[.\s]?\d{3}/);
  });

  it("fits the 6 KB gzip budget", () => {
    const size = gzipSync(renderToStaticMarkup(<ProductBag dict={viDict} images={[]} />)).length;
    expect(size).toBeLessThanOrEqual(6 * 1024);
  });
});

describe("the bag of story scene 6", () => {
  it("has the same data-bag groups as this bag, so buildBagTimeline fits both", () => {
    const { container } = renderBag();
    const names = (root: ParentNode) =>
      [...new Set(Array.from(root.querySelectorAll("[data-bag]"), (el) => el.getAttribute("data-bag")))].sort();
    const source = readFileSync("../brand/story/parts/bag.svg", "utf8");
    const scenePart = new DOMParser().parseFromString(source, "image/svg+xml");
    expect(names(scenePart)).toEqual(names(container));
    expect(names(container)).toEqual([...PARTS].sort());
  });
});
