import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoryBody } from "./StoryBody";

describe("StoryBody", () => {
  it("renders the sanitized HTML from the API as markup", () => {
    render(
      <StoryBody html='<h2>Tiêu đề phụ</h2><p>Đoạn <a href="https://example.com/x">liên kết</a></p>' />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Tiêu đề phụ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "liên kết" })).toHaveAttribute(
      "href",
      "https://example.com/x",
    );
  });
});
