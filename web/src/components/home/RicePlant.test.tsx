import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand/colors";
import { RiceEar, RiceLeaf } from "./RicePlant";

const ALLOWED = new Set<string>(Object.values(BRAND).map((c) => c.toLowerCase()));

function colorsOf(svg: Element): string[] {
  return [svg, ...Array.from(svg.querySelectorAll("*"))].flatMap((el) =>
    ["fill", "stroke"]
      .map((name) => el.getAttribute(name))
      .filter((v): v is string => v !== null && v !== "none"),
  );
}

describe("RiceLeaf", () => {
  it("renders a hidden svg with its animation hook", () => {
    const { container } = render(<RiceLeaf />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("data-journey-leaf");
  });

  it("uses only brand colors", () => {
    const { container } = render(<RiceLeaf />);
    const colors = colorsOf(container.querySelector("svg")!);
    expect(colors).toContain(BRAND.sprout);
    expect(colors.every((c) => ALLOWED.has(c.toLowerCase()))).toBe(true);
  });

  it("passes a class name to the svg", () => {
    const { container } = render(<RiceLeaf className="extra" />);
    expect(container.querySelector("svg")).toHaveClass("extra");
  });
});

describe("RiceEar", () => {
  it("renders a hidden svg with its animation hook", () => {
    const { container } = render(<RiceEar />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("data-journey-ear");
  });

  it("uses only brand colors", () => {
    const { container } = render(<RiceEar />);
    const colors = colorsOf(container.querySelector("svg")!);
    expect(colors).toContain(BRAND.grain);
    expect(colors.every((c) => ALLOWED.has(c.toLowerCase()))).toBe(true);
  });
});
