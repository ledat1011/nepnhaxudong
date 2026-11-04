import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { pathname, signOut } = vi.hoisted(() => ({ pathname: { value: "/admin" }, signOut: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ signOut }) }));

import { BottomNav } from "./BottomNav";

beforeEach(() => {
  pathname.value = "/admin";
  signOut.mockReset();
});

describe("BottomNav", () => {
  it("has five items", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Menu chính" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual([
      "Tổng quan",
      "Câu chuyện",
      "Ảnh",
      "Lịch sử",
    ]);
    expect(within(nav).getAllByRole("button")).toHaveLength(1);
    expect(within(nav).getByRole("button", { name: "Thêm" })).toBeInTheDocument();
  });

  it("marks only the open screen with aria-current", () => {
    pathname.value = "/admin/anh";
    render(<BottomNav />);
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.textContent)).toEqual(["Ảnh"]);
  });

  it("marks a screen that has a sub-path, and not the dashboard", () => {
    pathname.value = "/admin/cau-chuyen/7";
    render(<BottomNav />);
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.textContent)).toEqual(["Câu chuyện"]);
  });

  it("marks More when a screen of the More list is open", () => {
    pathname.value = "/admin/san-pham";
    render(<BottomNav />);
    expect(screen.getByRole("button", { name: "Thêm" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link").some((a) => a.hasAttribute("aria-current"))).toBe(false);
  });

  it("is fixed to the bottom and respects the safe area", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Menu chính" });
    expect(nav).toHaveClass("fixed", "bottom-0");
    expect(nav.className).toContain("env(safe-area-inset-bottom)");
  });

  it("opens the More sheet with the other screens and a sign-out button", async () => {
    const events = userEvent.setup();
    render(<BottomNav />);
    await events.click(screen.getByRole("button", { name: "Thêm" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getAllByRole("link").map((a) => a.textContent)).toEqual([
      "Sản phẩm",
      "Hành trình",
      "Báo chí",
      "Liên hệ & cài đặt",
      "Tài khoản",
    ]);
    await events.click(within(sheet).getByRole("button", { name: "Đăng xuất" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
