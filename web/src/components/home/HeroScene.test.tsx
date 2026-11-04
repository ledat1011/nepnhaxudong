import { render } from "@testing-library/react";
import { gzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ILLUSTRATION_PALETTE } from "@/lib/brand/colors";
import { HERO_CLOUD_STARTS, HERO_GUST_COUNT, HeroField, HeroSky, HeroSun } from "./HeroScene";

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
