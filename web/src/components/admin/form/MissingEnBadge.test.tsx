import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MissingEnBadge } from "./MissingEnBadge";

describe("MissingEnBadge", () => {
  it("shows the text", () => {
    render(<MissingEnBadge />);
    expect(screen.getByText("Thiếu EN")).toBeInTheDocument();
  });
});
