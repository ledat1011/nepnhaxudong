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

  it("sets a document title in both languages", () => {
    render(<LangError retry={vi.fn()} />);
    expect(document.title).toBe("Có lỗi xảy ra | Something went wrong | Nếp Nhà");
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

  it("has the header, main and footer landmarks of a whole page", () => {
    render(<LangError retry={vi.fn()} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nếp Nhà" })).toHaveAttribute("href", "/");
  });
});
