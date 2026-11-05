import { render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { UserResponse } from "@/lib/admin/types";

const { adminFetch, replace, pathname, search } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  replace: vi.fn(),
  pathname: { value: "/admin/anh" },
  search: { value: "" },
}));

vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/csrf", () => ({ resetCsrfToken: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname.value,
  useSearchParams: () => new URLSearchParams(search.value),
}));

import { AdminSessionProvider } from "@/lib/admin/session";
import { AppShell } from "./AppShell";
import { useScreenDetail, type ScreenDetail } from "./screen-detail";

const user: UserResponse = {
  id: 1,
  email: "an@example.com",
  displayName: "Nguyễn An",
  mustChangePassword: false,
  role: "OWNER",
  totpEnabled: false,
  mustSetupTotp: false,
  totpRequired: false,
};

function renderShell(children: ReactNode = <p>Nội dung riêng tư</p>) {
  return render(
    <AdminSessionProvider>
      <AppShell>{children}</AppShell>
    </AdminSessionProvider>,
  );
}

function EditedItem(detail: ScreenDetail) {
  useScreenDetail(detail);
  return <p>Nội dung riêng tư</p>;
}

beforeEach(() => {
  adminFetch.mockReset();
  replace.mockReset();
  pathname.value = "/admin/anh";
  search.value = "";
});

describe("AppShell", () => {
  it("redirects a signed-out visitor to the login page with the current path as next", async () => {
    adminFetch.mockRejectedValue(new AdminApiError(401, "Chưa đăng nhập.", "session-expired"));
    renderShell();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/dang-nhap?next=%2Fadmin%2Fanh"));
    expect(screen.queryByText("Nội dung riêng tư")).not.toBeInTheDocument();
  });

  it("redirects a user with a temporary password to the change-password page", async () => {
    adminFetch.mockResolvedValue({ ...user, mustChangePassword: true });
    renderShell();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/doi-mat-khau"));
    expect(screen.queryByText("Nội dung riêng tư")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Menu chính" })).not.toBeInTheDocument();
  });

  it("redirects a user whose two-factor login was switched off to the two-factor setup", async () => {
    adminFetch.mockResolvedValue({ ...user, mustSetupTotp: true });
    renderShell();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/bat-xac-thuc"));
    expect(screen.queryByText("Nội dung riêng tư")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Menu chính" })).not.toBeInTheDocument();
  });

  it("shows no private content while the session is loading", () => {
    adminFetch.mockReturnValue(new Promise(() => {}));
    renderShell();
    expect(screen.queryByText("Nội dung riêng tư")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Menu chính" })).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the content, the header with the screen and user name, and the bottom nav when ready", async () => {
    adminFetch.mockResolvedValue(user);
    renderShell();
    expect(await screen.findByText("Nội dung riêng tư")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("Ảnh");
    expect(screen.getByRole("banner")).toHaveTextContent("Nguyễn An");
    expect(screen.getByRole("navigation", { name: "Menu chính" })).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("names the screen in the one level-1 heading of the page", async () => {
    adminFetch.mockResolvedValue(user);
    renderShell();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Ảnh");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("shows a retry screen, not the login page, when the server cannot be reached", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(0, "Không kết nối được máy chủ."));
    renderShell();
    expect(await screen.findByText("Không kết nối được máy chủ.")).toBeInTheDocument();
    // It says what to do, not only what went wrong.
    expect(screen.getByText("Hãy kiểm tra Wi-Fi hoặc 4G, rồi bấm Thử lại.")).toBeInTheDocument();
    expect(screen.queryByText("Nội dung riêng tư")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    adminFetch.mockResolvedValueOnce(user);
    await userEvent.setup().click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Nội dung riêng tư")).toBeInTheDocument();
  });

  it("goes to the plain login URL, without next, after a deliberate sign-out", async () => {
    adminFetch.mockResolvedValue(user);
    renderShell();
    const events = userEvent.setup();
    await events.click(await screen.findByRole("button", { name: "Thêm" }));
    await events.click(await screen.findByRole("button", { name: "Đăng xuất" }));
    await waitFor(() => expect(screen.queryByText("Nội dung riêng tư")).not.toBeInTheDocument());
    expect(replace).toHaveBeenCalledWith("/admin/dang-nhap");
    expect(replace.mock.calls.filter(([url]) => String(url).includes("next="))).toEqual([]);
  });

  describe("on a detail page", () => {
    it("shows Quay lại to the list, the name of the item as the heading and Xem trên web", async () => {
      pathname.value = "/admin/san-pham/3";
      adminFetch.mockResolvedValue(user);
      renderShell(<EditedItem name="Gạo nếp cái hoa vàng" publicHref="/vi#san-pham" />);
      const header = await screen.findByRole("banner");
      const back = within(header).getByRole("link", { name: /^Quay lại/ });
      expect(back).toHaveAttribute("href", "/admin/san-pham");
      expect(back).toHaveAccessibleName("Quay lại danh sách sản phẩm");
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Gạo nếp cái hoa vàng");
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(header).toHaveTextContent("Sản phẩm");
      const web = within(header).getByRole("link", { name: /^Xem trên web/ });
      expect(web).toHaveAttribute("href", "/vi#san-pham");
      expect(web).toHaveAttribute("target", "_blank");
      expect(web).toHaveAttribute("rel", expect.stringContaining("noopener"));
    });

    it("goes back to Tổng quan when the page was opened from a to-do row", async () => {
      pathname.value = "/admin/san-pham/3";
      search.value = "o=product.description.en";
      adminFetch.mockResolvedValue(user);
      renderShell(<EditedItem name="Gạo nếp" publicHref={null} />);
      const back = await screen.findByRole("link", { name: "Quay lại Tổng quan" });
      expect(back).toHaveAttribute("href", "/admin");
      expect(screen.getByRole("banner")).toHaveTextContent("Sản phẩm");
    });

    it("has no Xem trên web while the item is not on the public site", async () => {
      pathname.value = "/admin/cau-chuyen/5";
      adminFetch.mockResolvedValue(user);
      renderShell(<EditedItem name="Mùa gặt" publicHref={null} />);
      const header = await screen.findByRole("banner");
      expect(within(header).getByRole("link", { name: /^Quay lại/ })).toHaveAttribute("href", "/admin/cau-chuyen");
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Mùa gặt");
      expect(within(header).queryByRole("link", { name: /Xem trên web/ })).not.toBeInTheDocument();
    });

    it("names the screen while the item is still loading", async () => {
      pathname.value = "/admin/san-pham/3";
      adminFetch.mockResolvedValue(user);
      renderShell();
      expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Sản phẩm");
      expect(screen.getByRole("link", { name: /^Quay lại/ })).toBeInTheDocument();
    });

    it("scrolls away with the page, so the form keeps the height of the screen", async () => {
      pathname.value = "/admin/san-pham/3";
      adminFetch.mockResolvedValue(user);
      renderShell(<EditedItem name="Gạo nếp" publicHref={null} />);
      expect(await screen.findByRole("banner")).not.toHaveClass("sticky");
    });
  });

  it("has no Quay lại on a list page", async () => {
    pathname.value = "/admin/san-pham";
    adminFetch.mockResolvedValue(user);
    renderShell();
    await screen.findByRole("banner");
    expect(screen.queryByRole("link", { name: /^Quay lại/ })).not.toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveClass("sticky");
  });
});
