import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/lib/admin/types";

const { pathname, signOut, session } = vi.hoisted(() => ({
  pathname: { value: "/admin" },
  signOut: vi.fn(),
  session: { role: "OWNER" as UserRole },
}));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ signOut, user: { role: session.role } }) }));

import { SideNav } from "./SideNav";
import { TodoCountContext } from "./todo-count";

beforeEach(() => {
  pathname.value = "/admin";
  signOut.mockReset();
  session.role = "OWNER";
});

function names() {
  const nav = screen.getByRole("navigation", { name: "Menu bên" });
  return within(nav)
    .getAllByRole("link")
    .map((a) => a.textContent);
}

describe("SideNav (screens 1024 px and wider)", () => {
  it("shows every screen at once, the daily four first, in the order of the phone menu", () => {
    render(<SideNav />);
    expect(names()).toEqual([
      "Tổng quan",
      "Sản phẩm",
      "Câu chuyện",
      "Ảnh",
      "Hành trình",
      "Báo chí",
      "Lịch sử",
      "Liên hệ & cài đặt",
      "Tài khoản",
    ]);
  });

  it("names the account screen Bảo mật for a member, as the phone menu does", () => {
    session.role = "MEMBER";
    render(<SideNav />);
    expect(names()).toContain("Bảo mật");
    expect(names()).not.toContain("Tài khoản");
  });

  it("is hidden on a phone, where the bottom menu is used", () => {
    render(<SideNav />);
    const nav = screen.getByRole("navigation", { name: "Menu bên" });
    expect(nav).toHaveClass("hidden", "lg:flex");
  });

  it("marks the open screen, also on a sub-page", () => {
    pathname.value = "/admin/lich-su";
    render(<SideNav />);
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.textContent)).toEqual(["Lịch sử"]);
  });

  it("signs out", async () => {
    render(<SideNav />);
    await userEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("shows the number of jobs to do on Tổng quan", () => {
    render(
      <TodoCountContext.Provider value={{ count: 4, publish: vi.fn() }}>
        <SideNav />
      </TodoCountContext.Provider>,
    );
    expect(screen.getByRole("link", { name: "Tổng quan, 4 việc cần làm" })).toBeInTheDocument();
  });
});
