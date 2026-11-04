import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Pagination } from "./Pagination";

const dict = getDictionary("vi");

describe("Pagination", () => {
  it("first page with more: only the next link", () => {
    render(<Pagination lang="vi" page={0} hasNext dict={dict} />);
    expect(screen.getByRole("navigation", { name: "Phân trang" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trang sau" })).toHaveAttribute(
      "href",
      "/vi/cau-chuyen?page=1",
    );
    expect(screen.queryByRole("link", { name: "Trang trước" })).not.toBeInTheDocument();
  });

  it("last page: only the previous link, to the bare list URL when going back to page 0", () => {
    render(<Pagination lang="vi" page={1} hasNext={false} dict={dict} />);
    expect(screen.getByRole("link", { name: "Trang trước" })).toHaveAttribute(
      "href",
      "/vi/cau-chuyen",
    );
    expect(screen.queryByRole("link", { name: "Trang sau" })).not.toBeInTheDocument();
  });

  it("middle page: both links", () => {
    render(<Pagination lang="vi" page={2} hasNext dict={dict} />);
    expect(screen.getByRole("link", { name: "Trang trước" })).toHaveAttribute(
      "href",
      "/vi/cau-chuyen?page=1",
    );
    expect(screen.getByRole("link", { name: "Trang sau" })).toHaveAttribute(
      "href",
      "/vi/cau-chuyen?page=3",
    );
  });

  it("uses the English section path and labels", () => {
    render(<Pagination lang="en" page={0} hasNext dict={getDictionary("en")} />);
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute(
      "href",
      "/en/stories?page=1",
    );
  });

  it("renders nothing when there is a single page", () => {
    const { container } = render(<Pagination lang="vi" page={0} hasNext={false} dict={dict} />);
    expect(container).toBeEmptyDOMElement();
  });
});
