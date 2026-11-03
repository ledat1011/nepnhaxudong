import { render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";
import { ContentImage } from "./ContentImage";

vi.mock("next/image", () => ({
  default: ({
    priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img data-priority={priority ? "true" : undefined} {...props} />
  ),
}));

const IMAGE = {
  url: "https://cdn.example.com/a.webp",
  width: 800,
  height: 600,
  alt: "Cánh đồng lúa",
};

describe("ContentImage", () => {
  it("renders the placeholder when there is no image", () => {
    render(<ContentImage image={null} sizes="100vw" placeholderLabel="Ảnh sắp được cập nhật" />);
    expect(screen.getByRole("img", { name: "Ảnh sắp được cập nhật" })).toBeInTheDocument();
  });

  it("renders the image with alt, size and source from the API", () => {
    render(<ContentImage image={IMAGE} sizes="100vw" placeholderLabel="Ảnh sắp được cập nhật" />);
    const img = screen.getByRole("img", { name: "Cánh đồng lúa" });
    expect(img).toHaveAttribute("src", "https://cdn.example.com/a.webp");
    expect(img).toHaveAttribute("width", "800");
    expect(img).toHaveAttribute("height", "600");
    expect(img).toHaveAttribute("sizes", "100vw");
  });

  it("passes priority through to next/image", () => {
    render(
      <ContentImage image={IMAGE} sizes="100vw" placeholderLabel="x" priority />,
    );
    expect(screen.getByRole("img", { name: "Cánh đồng lúa" })).toHaveAttribute(
      "data-priority",
      "true",
    );
  });
});
