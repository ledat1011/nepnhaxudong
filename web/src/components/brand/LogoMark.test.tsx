import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LogoMark } from "./LogoMark";

describe("LogoMark", () => {
  it("is hidden from assistive technology", () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("has no element ids, because the logo appears twice on a page", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelectorAll("[id]")).toHaveLength(0);
  });
});
