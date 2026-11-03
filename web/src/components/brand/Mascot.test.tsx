import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BRAND } from "@/lib/brand/colors";
import { Mascot } from "./Mascot";

describe("Mascot", () => {
  it("renders the four named groups once each", () => {
    const { container } = render(<Mascot title="Nếp Nhà" />);
    for (const id of ["head", "rice", "body", "eyes"]) {
      expect(container.querySelectorAll(`g#${id}`)).toHaveLength(1);
    }
  });

  it("sets a transform origin on head and rice", () => {
    const { container } = render(<Mascot title="Nếp Nhà" />);
    for (const id of ["head", "rice"]) {
      const group = container.querySelector<SVGGElement>(`g#${id}`);
      expect(group?.style.transformOrigin).not.toBe("");
    }
  });

  it("is exposed as an image with the given title", () => {
    render(<Mascot title="Nếp Nhà" />);
    expect(screen.getByRole("img", { name: "Nếp Nhà" })).toBeInTheDocument();
  });

  it("uses only brand colors for fill and stroke", () => {
    const { container } = render(<Mascot title="Nếp Nhà" />);
    const allowed = new Set<string>([...Object.values(BRAND), "none"]);
    const painted = container.querySelectorAll("[fill], [stroke]");
    expect(painted.length).toBeGreaterThan(0);
    for (const el of painted) {
      for (const attr of ["fill", "stroke"]) {
        const value = el.getAttribute(attr);
        if (value !== null) expect(allowed.has(value)).toBe(true);
      }
    }
  });
});
