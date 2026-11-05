import { render } from "@testing-library/react";
import { Fragment, isValidElement } from "react";
import { gzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ILLUSTRATION_PALETTE } from "@/lib/brand/colors";
import { HERO_CLOUD_STARTS, HERO_GUST_COUNT, HeroField, HeroSky, HeroSun } from "./HeroScene";

/**
 * A copy of the element tree close to what React writes into the RSC payload: function
 * components are called, every host element becomes ["$", type, key, props].
 */
function flight(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(flight);
  if (!isValidElement(node)) return node;
  const { key } = node;
  const type: unknown = node.type;
  const props = node.props as Record<string, unknown>;
  if (typeof type === "function") return flight((type as (p: unknown) => unknown)(props));
  if (type === Fragment) return flight(props.children);
  const { children, ...rest } = props;
  return ["$", type, key, { ...rest, children: flight(children) }];
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
    // The far and mid rows, the village and the ground are one inline svg that nothing moves.
    // Inline svg is not a candidate for the Largest Contentful Paint (an image would be).
    expect(container.querySelector("img")).toBeNull();
    const field = container.querySelector("svg[data-hero-field]");
    expect(field?.querySelectorAll("use").length).toBeGreaterThan(100);
    expect(field?.querySelector("[data-hero-gust]")).toBeNull();
    expect(field?.querySelector("[style*='transform']")).toBeNull();
    // Its own layer: a wrapper that never moves and keeps the field's paint inside.
    const layer = field?.parentElement;
    expect(layer).toHaveAttribute("data-hero-field-layer");
    expect(layer).toHaveClass("will-change-transform", "contain-paint");
    expect(layer?.querySelector("[data-hero-gust]")).toBeNull();
  });

  it("repeats the static field left and right, so it covers the full width of a wide hero", () => {
    const { container } = render(<HeroField />);
    const field = container.querySelector("svg[data-hero-field]");
    // Three 1440 wide tiles: the middle one is on the gust layer's scale.
    expect(field).toHaveAttribute("viewBox", "-1440 0 4320 260");
    const tile = field?.querySelector("g#nn-hero-field-tile");
    expect(tile?.querySelectorAll("use").length).toBeGreaterThan(100);
    const copies = [...(field?.querySelectorAll("use[href='#nn-hero-field-tile']") ?? [])];
    expect(copies.map((u) => u.getAttribute("x"))).toEqual(["-1440", "1440"]);
    const layer = field?.parentElement;
    expect(layer?.className).toContain("aspect-[4320/260]");
    expect(layer?.className).toContain("w-[calc(var(--hero-m)*14.19)]");
  });

  it("draws the stalk shapes without any transform, so each stalk is one node to walk", () => {
    const { container } = render(<HeroField />);
    const defs = container.querySelector("svg[data-hero-field] defs");
    expect(defs?.querySelectorAll("[data-grain]").length).toBe(30);
    expect(defs?.querySelectorAll("[transform]")).toHaveLength(0);
    expect(defs?.querySelectorAll("ellipse")).toHaveLength(0);
  });

  it("writes the field once in the markup, with no inner HTML string", () => {
    const html = renderToStaticMarkup(<Scene />);
    expect(html).not.toContain("data:image");
    expect(html.match(/id="nn-hero-stalk-a"/g)).toHaveLength(1);
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

  it("fits the 12 KB gzip budget, counting the HTML and the RSC payload", () => {
    // The page delivers a server component twice: as HTML and as the RSC payload (a JSON-like
    // copy of the element tree in a script). Both go through one gzip stream.
    const delivered = renderToStaticMarkup(<Scene />) + JSON.stringify(flight(<Scene />));
    expect(gzipSync(delivered).length).toBeLessThanOrEqual(12 * 1024);
  });
});
