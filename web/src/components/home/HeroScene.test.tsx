import { render } from "@testing-library/react";
import { gzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ILLUSTRATION_PALETTE } from "@/lib/brand/colors";
import {
  HERO_CLOUD_STARTS,
  HERO_GUST_COUNT,
  HeroField,
  HeroSky,
  HeroSun,
  STATIC_FIELD_IMAGE,
} from "./HeroScene";

/** The svg inside the static field image, parsed. */
function staticField(): Element {
  const prefix = "data:image/svg+xml,";
  expect(STATIC_FIELD_IMAGE.startsWith(prefix)).toBe(true);
  const text = decodeURIComponent(STATIC_FIELD_IMAGE.slice(prefix.length));
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  expect(doc.querySelector("parsererror")).toBeNull();
  return doc.documentElement;
}

function Scene() {
  return (
    <>
      <HeroSky />
      <HeroSun />
      <HeroField />
    </>
  );
}

describe("HeroScene", () => {
  it("has 3 clouds, a sun with rays and 5 gust groups", () => {
    const { container } = render(<Scene />);
    expect(container.querySelectorAll("[data-hero-cloud]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-hero-sun-rays]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-hero-sun]")).toHaveLength(1);
    const gusts = container.querySelectorAll("[data-hero-gust]");
    expect(gusts).toHaveLength(HERO_GUST_COUNT);
    expect(HERO_GUST_COUNT).toBe(5);
    const stalks = [...gusts].reduce((n, g) => n + g.querySelectorAll("[data-hero-stalk]").length, 0);
    expect(stalks).toBeGreaterThanOrEqual(20);
    expect(stalks).toBeLessThanOrEqual(24);
  });

  it("draws each moving part as its own svg, so the static field is never repainted", () => {
    const { container } = render(<Scene />);
    // Only the outermost svg of a moving part is transformed; nothing moves inside an svg.
    const moving = container.querySelectorAll(
      "[data-hero-cloud], [data-hero-gust], [data-hero-sun], [data-hero-sun-rays]",
    );
    expect(moving).toHaveLength(3 + HERO_GUST_COUNT + 2);
    for (const el of moving) {
      expect(el.tagName.toLowerCase()).toBe("svg");
      expect(el.parentElement?.closest("svg")).toBeNull();
      expect(el).toHaveClass("will-change-transform");
    }
    // The far and mid rows, the village and the ground are one image that nothing moves.
    const field = container.querySelector("img[data-hero-field]");
    expect(field).toHaveAttribute("src", STATIC_FIELD_IMAGE);
    expect(field).toHaveAttribute("alt", "");
    expect(field).toHaveAttribute("width", "1440");
    expect(field).toHaveAttribute("height", "260");
    expect(field).not.toHaveAttribute("loading", "lazy");
    expect(field).not.toHaveClass("will-change-transform");
    const image = staticField();
    expect(image.querySelectorAll("use").length).toBeGreaterThan(100);
    expect(image.querySelector("[data-hero-gust]")).toBeNull();
  });

  it("draws the stalk shapes without any transform, so each stalk is one node to walk", () => {
    const { container } = render(<HeroField />);
    for (const defs of [container.querySelector("svg[data-hero-defs] defs"), staticField().querySelector("defs")]) {
      expect(defs?.querySelectorAll("[data-grain]").length).toBe(30);
      expect(defs?.querySelectorAll("[transform]")).toHaveLength(0);
      expect(defs?.querySelectorAll("ellipse")).toHaveLength(0);
    }
  });

  it("uses only palette colors in the static field image", () => {
    const colors = new Set<string>();
    for (const el of staticField().querySelectorAll("*")) {
      for (const name of ["fill", "stroke"]) {
        const value = el.getAttribute(name);
        if (value !== null && value !== "none") colors.add(value.toLowerCase());
      }
    }
    expect(colors.size).toBeGreaterThan(0);
    for (const color of colors) expect(ILLUSTRATION_PALETTE.has(color), color).toBe(true);
  });

  it("keeps each gust svg on the field's scale, with its bottom on the field's bottom edge", () => {
    const { container } = render(<HeroField />);
    for (const gust of container.querySelectorAll<SVGSVGElement>("svg[data-hero-gust]")) {
      const [x, y, w, h] = (gust.getAttribute("viewBox") ?? "").split(" ").map(Number);
      expect(y + h).toBe(260);
      expect(parseFloat(gust.style.left)).toBeCloseTo((x / 1440) * 100, 3);
      expect(parseFloat(gust.style.top)).toBeCloseTo((y / 260) * 100, 3);
      expect(parseFloat(gust.style.width)).toBeCloseTo((w / 1440) * 100, 3);
      expect(parseFloat(gust.style.height)).toBeCloseTo((h / 260) * 100, 3);
    }
  });

  it("places the clouds at the start positions, the second one smaller", () => {
    expect(HERO_CLOUD_STARTS).toEqual([0.08, 0.42, 0.74]);
    const { container } = render(<HeroSky />);
    const clouds = [...container.querySelectorAll<SVGElement>("[data-hero-cloud]")];
    expect(clouds.map((c) => c.style.left)).toEqual(["8%", "42%", "74%"]);
    const widths = clouds.map((c) => parseFloat(c.style.width));
    expect(widths[1]).toBeLessThan(widths[0]);
    expect(widths[1]).toBeLessThan(widths[2]);
  });

  it("orders the gust groups from left to right", () => {
    const { container } = render(<HeroField />);
    // Each stalk is placed with translate(x 260): its root sits on the bottom edge of the field.
    const roots = [...container.querySelectorAll("[data-hero-gust]")].map((g) =>
      [...g.querySelectorAll("[data-hero-stalk]")].map((s) => {
        const match = /^translate\(([\d.]+) 260\)/.exec(s.getAttribute("transform") ?? "");
        expect(match, s.getAttribute("transform") ?? "").not.toBeNull();
        return Number(match?.[1]);
      }),
    );
    const flat = roots.flat();
    expect(flat).toEqual([...flat].sort((a, b) => a - b));
    for (let i = 1; i < roots.length; i++) {
      expect(Math.min(...roots[i])).toBeGreaterThan(Math.max(...roots[i - 1]));
    }
  });

  it("is decorative", () => {
    const { container } = render(<Scene />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    }
  });

  it("uses only palette colors", () => {
    const { container } = render(<Scene />);
    const used = new Set<string>();
    for (const el of container.querySelectorAll("*")) {
      for (const name of ["fill", "stroke", "stop-color"]) {
        const value = el.getAttribute(name);
        if (value === null || value === "none" || value.startsWith("url(")) continue;
        used.add(value.toLowerCase());
      }
    }
    expect(used.size).toBeGreaterThan(0);
    for (const color of used) expect(ILLUSTRATION_PALETTE.has(color), color).toBe(true);
  });

  it("fits the 12 KB gzip budget", () => {
    const size = gzipSync(renderToStaticMarkup(<Scene />)).length;
    expect(size).toBeLessThanOrEqual(12 * 1024);
  });
});
