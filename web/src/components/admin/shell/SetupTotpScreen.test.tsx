import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminFetch, replace, refresh, requireReLogin, signOut, session } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  requireReLogin: vi.fn(),
  signOut: vi.fn(),
  session: { status: "must-setup-totp" as string },
}));

vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ status: session.status, refresh, signOut, requireReLogin }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { SetupTotpScreen } from "./SetupTotpScreen";

beforeEach(() => {
  adminFetch.mockReset();
  replace.mockReset();
  refresh.mockReset();
  refresh.mockResolvedValue(undefined);
  signOut.mockReset();
  session.status = "must-setup-totp";
  adminFetch.mockImplementation(async (path: string) =>
    path === "/admin/me/totp/setup" ? { secret: "JBSWY3DPEHPK3PXP", otpauthUri: "otpauth://totp/x" } : undefined,
  );
});

describe("SetupTotpScreen", () => {
  it("says why the setup is needed and offers only the setup and a sign-out", () => {
    render(<SetupTotpScreen />);
    expect(screen.getByRole("heading", { level: 1, name: "Bật lại xác thực 2 lớp" })).toBeInTheDocument();
    expect(screen.getByText(/Chủ đã tắt xác thực 2 lớp của bạn/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bật xác thực 2 lớp" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đăng xuất" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Đổi mật khẩu" })).not.toBeInTheDocument();
  });

  it("reads the session again and opens the dashboard once two-factor login is on", async () => {
    const user = userEvent.setup();
    render(<SetupTotpScreen />);
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    await user.type(await screen.findByLabelText("Mã 6 số"), "123456");
    await user.click(screen.getByRole("button", { name: "Xác nhận và bật" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("signs out", async () => {
    const user = userEvent.setup();
    render(<SetupTotpScreen />);
    await user.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["signed-out", "/admin/dang-nhap"],
    ["must-change-password", "/admin/doi-mat-khau"],
    ["ready", "/admin"],
  ])("sends a %s session to %s", async (status, target) => {
    session.status = status;
    render(<SetupTotpScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(target));
    expect(screen.queryByRole("button", { name: "Bật xác thực 2 lớp" })).not.toBeInTheDocument();
  });
});
