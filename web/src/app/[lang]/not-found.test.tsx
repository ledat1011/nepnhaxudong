import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LangNotFound from "./not-found";

describe("LangNotFound", () => {
  it("sets a document title and shows the 404 text", () => {
    const { container } = render(<LangNotFound />);
    expect(document.title).toBe("Không tìm thấy trang | Page not found | Nếp Nhà");
    expect(container.querySelector("h1")).toHaveTextContent("Không tìm thấy trang");
  });

  it("has the header, main and footer landmarks of a whole page", () => {
    render(<LangNotFound />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
