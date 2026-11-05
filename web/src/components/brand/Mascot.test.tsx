import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BRAND, ILLUSTRATION_ONLY_COLORS } from "@/lib/brand/colors";
import { Mascot } from "./Mascot";

describe("Mascot", () => {
  it("renders the four named groups once each and no eyes group", () => {
    const { container } = render(<Mascot title="Nếp Nhà" />);
    for (const id of ["head", "rice", "hands", "body"]) {
      expect(container.querySelectorAll(`g#${id}`)).toHaveLength(1);
    }
    expect(container.querySelector("g#eyes")).toBeNull();
  });

  it("is exposed as an image with the given title", () => {
    const { container } = render(<Mascot title="Nếp Nhà" />);
    expect(screen.getByRole("img", { name: "Nếp Nhà" })).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("data-mascot");
  });

  it("uses only brand and mascot colors for fill and stroke", () => {
    const { container } = render(<Mascot title="Nếp Nhà" />);
    const allowed = new Set<string>(
      [...Object.values(BRAND), ...Object.values(ILLUSTRATION_ONLY_COLORS), "none"].map((c) => c.toLowerCase()),
    );
    const painted = container.querySelectorAll("[fill], [stroke]");
    expect(painted.length).toBeGreaterThan(0);
    for (const el of painted) {
      for (const attr of ["fill", "stroke"]) {
        const value = el.getAttribute(attr);
        if (value !== null) expect(allowed.has(value.toLowerCase())).toBe(true);
      }
    }
  });
});
