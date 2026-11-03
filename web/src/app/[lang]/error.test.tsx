import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LangError from "./error";

describe("LangError", () => {
  it("shows both languages, each in an element with its own lang", () => {
    const { container } = render(<LangError retry={vi.fn()} />);
    expect(container.querySelector('section[lang="vi"]')).toHaveTextContent("Có lỗi xảy ra");
    expect(container.querySelector('section[lang="en"]')).toHaveTextContent(
      "Something went wrong",
    );
    expect(container.querySelector('button [lang="vi"]')).toHaveTextContent("Thử lại");
    expect(container.querySelector('button [lang="en"]')).toHaveTextContent("Try again");
  });

  it("has exactly one h1", () => {
    render(<LangError retry={vi.fn()} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("calls retry when the button is clicked", async () => {
    const retry = vi.fn();
    render(<LangError retry={retry} />);
    await userEvent.setup().click(screen.getByRole("button"));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("links to both home pages", () => {
    render(<LangError retry={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toHaveAttribute("href", "/vi");
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
  });
});
