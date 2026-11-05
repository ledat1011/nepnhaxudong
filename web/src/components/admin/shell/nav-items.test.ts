import { describe, expect, it } from "vitest";
import { parentScreen, screenTitle } from "./nav-items";

describe("parentScreen", () => {
  it("names the list a detail page goes back to", () => {
    expect(parentScreen("/admin/san-pham/3")).toEqual({ href: "/admin/san-pham", label: "Sản phẩm" });
    expect(parentScreen("/admin/san-pham/moi")).toEqual({ href: "/admin/san-pham", label: "Sản phẩm" });
    expect(parentScreen("/admin/cau-chuyen/12")).toEqual({ href: "/admin/cau-chuyen", label: "Câu chuyện" });
  });

  it("is null on a list page and on the dashboard", () => {
    expect(parentScreen("/admin/san-pham")).toBeNull();
    expect(parentScreen("/admin")).toBeNull();
    expect(parentScreen("/admin/lich-su")).toBeNull();
  });
});

describe("screenTitle", () => {
  it("still names the screen of a detail page", () => {
    expect(screenTitle("/admin/san-pham/3")).toBe("Sản phẩm");
  });
});
