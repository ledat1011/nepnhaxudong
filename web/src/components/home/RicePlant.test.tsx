import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand/colors";
import { RICE_STAGES } from "@/lib/story/scenes";
import { RiceEar, RiceLeaf, StageIcon } from "./RicePlant";

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

describe("StageIcon", () => {
  it.each(RICE_STAGES)("draws the %s as a hidden 32 px icon in brand colours", (stage) => {
    const { container } = render(<StageIcon stage={stage} />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveAttribute("data-stage", stage);
    expect(svg).toHaveAttribute("viewBox", "0 0 32 32");
    expect(svg.childElementCount).toBeGreaterThan(0);
    expect(colorsOf(svg).every((c) => ALLOWED.has(c.toLowerCase()))).toBe(true);
    // Every icon has the dark ink outline of the drawings.
    expect(colorsOf(svg)).toContain(BRAND.earth);
  });

  it("tells the stages apart by colour: green sprout, gold paddy, white rice, brown bowl", () => {
    const fills = (stage: (typeof RICE_STAGES)[number]) =>
      colorsOf(render(<StageIcon stage={stage} />).container.querySelector("svg")!);
    expect(fills("seed")).toContain(BRAND.sprout);
    expect(fills("paddy")).toContain(BRAND.grain);
    expect(fills("rice")).toContain(BRAND.rice);
    expect(fills("rice")).not.toContain(BRAND.grain);
    expect(fills("bowl")).toContain(BRAND.coat);
  });
});
