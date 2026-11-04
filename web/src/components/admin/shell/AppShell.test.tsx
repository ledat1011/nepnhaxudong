import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { UserResponse } from "@/lib/admin/types";

const { adminFetch, replace, pathname } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  replace: vi.fn(),
  pathname: { value: "/admin/anh" },
}));

vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/csrf", () => ({ resetCsrfToken: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname.value,
}));

import { AdminSessionProvider } from "@/lib/admin/session";
import { AppShell } from "./AppShell";

const user: UserResponse = { id: 1, email: "an@example.com", displayName: "Nguyễn An", mustChangePassword: false };

function renderShell() {
  return render(
    <AdminSessionProvider>
      <AppShell>
        <p>Nội dung riêng tư</p>
      </AppShell>
    </AdminSessionProvider>,
  );
}

beforeEach(() => {
  adminFetch.mockReset();
  replace.mockReset();
  pathname.value = "/admin/anh";
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
});
