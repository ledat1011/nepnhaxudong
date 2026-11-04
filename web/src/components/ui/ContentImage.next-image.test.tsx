import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContentImage } from "./ContentImage";

// The real next/image, not a mock: in Next 16 `priority` alone does not write
// fetchpriority="high" on the <img>, so this checks what Next really renders.
const IMAGE = {
  url: "https://cdn.example.com/bia.webp",
  width: 1600,
  height: 900,
  alt: "Ảnh bìa",
};

describe("ContentImage with the real next/image", () => {
  it("writes fetchpriority=high and loading=eager for the top image", () => {
    render(<ContentImage image={IMAGE} sizes="100vw" placeholderLabel="x" fetchPriority="high" />);
    const img = screen.getByRole("img", { name: "Ảnh bìa" });
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("keeps other images lazy", () => {
    render(<ContentImage image={IMAGE} sizes="100vw" placeholderLabel="x" />);
    expect(screen.getByRole("img", { name: "Ảnh bìa" })).toHaveAttribute("loading", "lazy");
  });
});
