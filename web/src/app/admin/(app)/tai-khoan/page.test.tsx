import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { UserSummary } from "@/lib/admin/types";

const { adminFetch, requireReLogin, refresh, session } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  refresh: vi.fn(),
  session: {
    user: { id: 1, role: "OWNER", totpEnabled: false, totpRequired: false } as {
      id: number;
      role: string;
      totpEnabled: boolean;
      totpRequired: boolean;
    },
  },
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin, refresh, user: session.user }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import AccountsPage from "./page";

function account(id: number, name: string, overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    id,
    email: `${name.toLowerCase()}@example.com`,
    displayName: name,
    enabled: true,
    totpEnabled: false,
    mustChangePassword: false,
    role: "MEMBER",
    mustSetupTotp: false,
    totpRequired: false,
    ...overrides,
  };
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  refresh.mockReset();
  refresh.mockResolvedValue(undefined);
  session.user = { id: 1, role: "OWNER", totpEnabled: false, totpRequired: false };
});

describe("Tài khoản page of a member", () => {
  it("shows only the own two-factor card, from the session, and never asks for the account list", async () => {
    session.user = { id: 2, role: "MEMBER", totpEnabled: true, totpRequired: false };
    render(<AccountsPage />);
    expect(screen.getByRole("heading", { name: "Xác thực 2 lớp" })).toBeInTheDocument();
    expect(screen.getByText("Đang bật")).toBeInTheDocument();
    expect(screen.getByText(/Tài khoản của cả nhà do Chủ quản lý/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Danh sách tài khoản" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thêm người nhà" })).not.toBeInTheDocument();
    await waitFor(() => expect(adminFetch).not.toHaveBeenCalled());
  });

  it("offers no switch-off to a member whose two-factor login an owner made required", () => {
    session.user = { id: 2, role: "MEMBER", totpEnabled: true, totpRequired: true };
    render(<AccountsPage />);
    expect(screen.queryByRole("button", { name: "Tắt xác thực 2 lớp" })).not.toBeInTheDocument();
    expect(screen.getByText("Chỉ Chủ tắt được xác thực 2 lớp của bạn.")).toBeInTheDocument();
  });

  it("reads the session again after the member switched two-factor login on", async () => {
    const user = userEvent.setup();
    session.user = { id: 2, role: "MEMBER", totpEnabled: false, totpRequired: false };
    adminFetch.mockImplementation(async (path: string) =>
      path === "/admin/me/totp/setup" ? { secret: "JBSWY3DPEHPK3PXP", otpauthUri: "otpauth://totp/x" } : undefined,
    );
    render(<AccountsPage />);
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    await user.type(await screen.findByLabelText("Mã 6 số"), "123456");
    await user.click(screen.getByRole("button", { name: "Xác nhận và bật" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(adminFetch.mock.calls.filter(([path]) => path === "/admin/users")).toHaveLength(0);
  });
});

describe("Tài khoản page", () => {
  it("shows the card of the signed-in user and the list of accounts from one request", async () => {
    adminFetch.mockResolvedValue([account(1, "An"), account(2, "Bình")]);
    render(<AccountsPage />);
    expect(await screen.findByRole("listitem", { name: "Bình" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Xác thực 2 lớp" })).toBeInTheDocument();
    expect(screen.getByText("Chưa bật")).toBeInTheDocument();
    expect(adminFetch.mock.calls.filter(([path]) => path === "/admin/users")).toHaveLength(1);
  });

  it("shows the card as switched on when the account has two-factor login", async () => {
    adminFetch.mockResolvedValue([account(1, "An", { totpEnabled: true })]);
    render(<AccountsPage />);
    expect(await screen.findByText("Đang bật")).toBeInTheDocument();
  });

  it("shows the API text and loads again on Thử lại", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    adminFetch.mockResolvedValue([account(1, "An")]);
    render(<AccountsPage />);
    expect(await screen.findByText("Máy chủ đang bận.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("listitem", { name: "An" })).toBeInTheDocument();
  });

  it("loads the list again after an account was disabled", async () => {
    const user = userEvent.setup();
    let loads = 0;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (init?.method === "POST") return undefined;
      expect(path).toBe("/admin/users");
      loads += 1;
      return loads === 1 ? [account(1, "An"), account(2, "Bình")] : [account(1, "An"), account(2, "Bình", { enabled: false })];
    });
    render(<AccountsPage />);
    const row = await screen.findByRole("listitem", { name: "Bình" });
    await user.click(within(row).getByRole("button", { name: /^Khóa/ }));
    await user.click(await screen.findByRole("button", { name: "Khóa tài khoản" }));
    expect(await within(await screen.findByRole("listitem", { name: "Bình" })).findByText("Đã khóa")).toBeInTheDocument();
  });

  it("ignores a slow answer of an older load when a newer load already finished", async () => {
    const user = userEvent.setup();
    const resolvers: ((users: UserSummary[]) => void)[] = [];
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "POST") return undefined;
      return new Promise<UserSummary[]>((resolve) => resolvers.push(resolve));
    });
    render(<AccountsPage />);
    await waitFor(() => expect(resolvers).toHaveLength(1));
    await act(async () => resolvers[0]([account(1, "An"), account(2, "Bình")]));
    const row = await screen.findByRole("listitem", { name: "Bình" });
    // Two changes in a row start two reloads. The first reload answers last.
    await user.click(within(row).getByRole("button", { name: /^Đặt lại mật khẩu/ }));
    await user.click(await screen.findByRole("button", { name: "Đặt lại mật khẩu" }));
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await user.click(await screen.findByRole("button", { name: "Xong" }));
    await user.click(within(await screen.findByRole("listitem", { name: "Bình" })).getByRole("button", { name: /^Khóa/ }));
    await user.click(await screen.findByRole("button", { name: "Khóa tài khoản" }));
    await waitFor(() => expect(resolvers).toHaveLength(3));
    await act(async () => resolvers[2]([account(1, "An"), account(2, "Bình", { enabled: false })]));
    await act(async () => resolvers[1]([account(1, "An"), account(2, "Bình")]));
    const finalRow = await screen.findByRole("listitem", { name: "Bình" });
    expect(within(finalRow).getByText("Đã khóa")).toBeInTheDocument();
  });

  it("drops an open secret when a reload shows that two-factor login changed elsewhere", async () => {
    const user = userEvent.setup();
    let enabledElsewhere = false;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path === "/admin/me/totp/setup") return { secret: "JBSWY3DPEHPK3PXP", otpauthUri: "otpauth://totp/x?secret=JBSWY3DPEHPK3PXP" };
      if (init?.method === "POST") {
        enabledElsewhere = true;
        return undefined;
      }
      return [account(1, "An", { totpEnabled: enabledElsewhere }), account(2, "Bình")];
    });
    render(<AccountsPage />);
    await user.click(await screen.findByRole("button", { name: "Bật xác thực 2 lớp" }));
    await screen.findByText("JBSWY3DPEHPK3PXP");
    await user.click(within(screen.getByRole("listitem", { name: "Bình" })).getByRole("button", { name: /^Khóa/ }));
    await user.click(await screen.findByRole("button", { name: "Khóa tài khoản" }));
    expect(await screen.findByText("Đang bật")).toBeInTheDocument();
    expect(screen.queryByText("JBSWY3DPEHPK3PXP")).not.toBeInTheDocument();
  });
});
