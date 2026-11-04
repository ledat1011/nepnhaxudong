import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NOT_FOUND_TITLE, NotFoundContent } from "./NotFoundContent";

describe("NotFoundContent", () => {
  it("shows both languages, each in an element with its own lang", () => {
    const { container } = render(<NotFoundContent />);
    expect(container.querySelector('section[lang="vi"]')).toHaveTextContent(
      "Không tìm thấy trang",
    );
    expect(container.querySelector('section[lang="en"]')).toHaveTextContent("Page not found");
  });

  it("has exactly one h1, the Vietnamese one, and the English title is an h2", () => {
    render(<NotFoundContent />);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent("Không tìm thấy trang");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Page not found");
  });

  it("links to both home pages", () => {
    render(<NotFoundContent />);
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/vi");
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
  });

  it("has a title in both languages", () => {
    expect(NOT_FOUND_TITLE).toBe("Không tìm thấy trang | Page not found | Nếp Nhà");
  });
});
