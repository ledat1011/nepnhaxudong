import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeading } from "./SectionHeading";

describe("SectionHeading", () => {
  it("balances its lines, so no single word stands alone on the last line", () => {
    render(<SectionHeading id="bao-chi" title="Báo chí nói về Nếp Nhà" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-balance");
  });
});
