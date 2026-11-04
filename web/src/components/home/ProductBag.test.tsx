import { render } from "@testing-library/react";
import { gzipSync } from "node:zlib";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ILLUSTRATION_PALETTE } from "@/lib/brand/colors";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ProductBag } from "./ProductBag";

const vi = getDictionary("vi");
const en = getDictionary("en");

/** The parts the motion code (Task 6) moves. The static markup is the final frame. */
const PARTS = ["puffy", "brick", "grains", "wrinkles", "air", "seal", "label", "tray"];

function renderBag(dict = vi) {
  return render(<ProductBag dict={dict} />);
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
    for (const dict of [vi, en]) {
      const { container, unmount } = renderBag(dict);
      const label = part(container, "label")?.textContent ?? "";
      expect(label).toContain("GẠO NẾP CÁI HOA VÀNG");
      expect(label).toContain("DUY TÂN");
      expect(label).toContain("2KG");
      unmount();
    }
  });

  it("shows the 3 notes as HTML text, in order, in Vietnamese", () => {
    const { container } = renderBag(vi);
    const notes = [...container.querySelectorAll("ul [data-bag-note]")].map((n) => n.textContent);
    expect(notes).toEqual([
      "Túi trong — nhìn rõ từng hạt gạo",
      "Hút chân không — gạo giữ khô và thơm lâu",
      "Khối vuông — dễ cất, dễ làm quà",
    ]);
  });

  it("shows the 3 notes in English", () => {
    const { container } = renderBag(en);
    const notes = [...container.querySelectorAll("ul [data-bag-note]")].map((n) => n.textContent);
    expect(notes).toEqual([
      "Clear bag — you can see every grain",
      "Vacuum packed — the rice stays dry and fragrant for longer",
      "A firm square block — easy to store and to give",
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
    const size = gzipSync(renderToStaticMarkup(<ProductBag dict={vi} />)).length;
    expect(size).toBeLessThanOrEqual(6 * 1024);
  });
});
