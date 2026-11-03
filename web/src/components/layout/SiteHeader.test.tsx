import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteHeader } from "./SiteHeader";

const NAV = [
  { id: "san-pham", label: "Sản phẩm" },
  { id: "hanh-trinh", label: "Hành trình" },
];

function renderHeader(zalo: string | null) {
  return render(
    <SiteHeader
      lang="vi"
      dict={getDictionary("vi")}
      nav={NAV}
      zalo={zalo}
      alternateHref="/en"
    />,
  );
}

describe("SiteHeader", () => {
  it("links the logo to the home page of the language", () => {
    renderHeader(null);
    const home = screen.getByRole("link", { name: /Nếp Nhà/ });
    expect(home).toHaveAttribute("href", "/vi");
  });

  it("renders exactly the given nav items as home anchors", () => {
    renderHeader(null);
    const nav = screen.getByRole("navigation", { name: "Điều hướng chính" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Sản phẩm", "Hành trình"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/vi#san-pham",
      "/vi#hanh-trinh",
    ]);
  });

  it("has one primary navigation landmark", () => {
    renderHeader(null);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("links to Zalo with a digits-only number", () => {
    renderHeader("0000 000 000");
    expect(screen.getByRole("link", { name: "Zalo" })).toHaveAttribute(
      "href",
      "https://zalo.me/0000000000",
    );
  });

  it("has no Zalo link when zalo is null", () => {
    renderHeader(null);
    expect(screen.queryByRole("link", { name: "Zalo" })).not.toBeInTheDocument();
  });

  it("links to the other language with hreflang", () => {
    renderHeader(null);
    const link = screen.getByRole("link", { name: "English" });
    expect(link).toHaveAttribute("href", "/en");
    expect(link).toHaveAttribute("hreflang", "en");
    expect(link).toHaveAttribute("lang", "en");
  });

  it("keeps focusable controls in the order they are drawn", () => {
    const { container } = renderHeader("0000 000 000");
    // The closed mobile panel is hidden, so it is not focusable.
    const controls = Array.from(container.querySelectorAll("a[href], button"))
      .filter((el) => !el.closest("[hidden]"))
      .map((el) => el.getAttribute("aria-label") ?? el.textContent);
    // Small screens draw: logo, language, Zalo, menu button.
    // Large screens draw: logo, nav links, language, Zalo.
    expect(controls).toEqual([
      "Nếp Nhà",
      "Sản phẩm",
      "Hành trình",
      "English",
      "Zalo",
      "Mở menu",
    ]);
  });

  it("does not reorder elements with CSS order classes", () => {
    const { container } = renderHeader("0000 000 000");
    const reordered = Array.from(container.querySelectorAll("[class]")).filter((el) =>
      el.className
        .toString()
        .split(/\s+/)
        .some((token) => /^(?:[a-z0-9[\]-]+:)*-?order-/.test(token)),
    );
    expect(reordered).toEqual([]);
  });
});
