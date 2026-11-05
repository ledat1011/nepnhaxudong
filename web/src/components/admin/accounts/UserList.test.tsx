import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { UserSummary } from "@/lib/admin/types";

const { adminFetch, requireReLogin, session } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  session: { user: { id: 1 } as { id: number } | null },
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin, user: session.user }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { UserList } from "./UserList";

function account(overrides: Partial<UserSummary>): UserSummary {
  return {
    id: 1,
    email: "an@example.com",
    displayName: "An",
    enabled: true,
    totpEnabled: false,
    mustChangePassword: false,
    role: "MEMBER",
    mustSetupTotp: false,
    totpRequired: false,
    ...overrides,
  };
}

const users: UserSummary[] = [
  account({ id: 1, displayName: "An", totpEnabled: true }),
  account({ id: 2, displayName: "Bình", email: "binh@example.com" }),
  account({ id: 3, displayName: "Chi", email: "chi@example.com", enabled: false }),
];

function row(name: string): HTMLElement {
  return screen.getByRole("listitem", { name });
}

function posts(): [string, unknown][] {
  return adminFetch.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([path, init]) => [path as string, init.body]);
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  session.user = { id: 1 };
  adminFetch.mockResolvedValue(undefined);
});

describe("UserList", () => {
  it("shows name, email, status and the two-factor badge", () => {
    render(<UserList users={users} onChanged={vi.fn()} />);
    expect(within(row("An")).getByText("an@example.com")).toBeInTheDocument();
    expect(within(row("An")).getByText("Đang dùng")).toBeInTheDocument();
    expect(within(row("An")).getByText("Có 2 lớp")).toBeInTheDocument();
    expect(within(row("Bình")).queryByText("Có 2 lớp")).not.toBeInTheDocument();
    expect(within(row("Chi")).getByText("Đã khóa")).toBeInTheDocument();
  });

  it("has no Khóa and no Đặt lại mật khẩu button on the row of the signed-in user, and has them on the others", () => {
    render(<UserList users={users} onChanged={vi.fn()} />);
    expect(within(row("An")).queryByRole("button", { name: /^Khóa/ })).not.toBeInTheDocument();
    expect(within(row("An")).queryByRole("button", { name: /^Đặt lại mật khẩu/ })).not.toBeInTheDocument();
    expect(within(row("Bình")).getByRole("button", { name: /^Khóa/ })).toBeInTheDocument();
    expect(within(row("Bình")).getByRole("button", { name: /^Đặt lại mật khẩu/ })).toBeInTheDocument();
    expect(within(row("Chi")).getByRole("button", { name: /^Mở khóa/ })).toBeInTheDocument();
  });

  it("shows a Khóa button on every row while the signed-in user is not known", () => {
    session.user = null;
    render(<UserList users={users} onChanged={vi.fn()} />);
    expect(within(row("An")).getByRole("button", { name: /^Khóa/ })).toBeInTheDocument();
  });

  it("asks before it disables, then posts and reloads", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<UserList users={users} onChanged={onChanged} />);
    await user.click(within(row("Bình")).getByRole("button", { name: /^Khóa/ }));
    expect(posts()).toHaveLength(0);
    await user.click(await screen.findByRole("button", { name: "Khóa tài khoản" }));
    await waitFor(() => expect(posts()).toEqual([["/admin/users/2/disable", undefined]]));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("disables the buttons of every row while a change runs", async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    adminFetch.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<UserList users={users} onChanged={vi.fn()} />);
    await user.click(within(row("Bình")).getByRole("button", { name: /^Khóa/ }));
    await user.click(await screen.findByRole("button", { name: "Khóa tài khoản" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(within(row("Chi")).getByRole("button", { name: /^Mở khóa/ })).toBeDisabled();
    expect(within(row("Chi")).getByRole("button", { name: /^Đặt lại mật khẩu/ })).toBeDisabled();
    expect(within(row("Bình")).getByRole("button", { name: /^Khóa/ })).toBeDisabled();
    finish();
    await waitFor(() => expect(within(row("Chi")).getByRole("button", { name: /^Mở khóa/ })).toBeEnabled());
  });

  it("does nothing when the question is answered with Hủy", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<UserList users={users} onChanged={onChanged} />);
    await user.click(within(row("Bình")).getByRole("button", { name: /^Khóa/ }));
    await user.click(await screen.findByRole("button", { name: "Hủy" }));
    expect(posts()).toHaveLength(0);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("asks before it enables, then posts", async () => {
    const user = userEvent.setup();
    render(<UserList users={users} onChanged={vi.fn()} />);
    await user.click(within(row("Chi")).getByRole("button", { name: /^Mở khóa/ }));
    await user.click(await screen.findByRole("button", { name: "Mở khóa tài khoản" }));
    await waitFor(() => expect(posts()).toEqual([["/admin/users/3/enable", undefined]]));
  });

  it("shows the API text when the API refuses", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValue(new AdminApiError(409, "Bạn không thể khóa tài khoản của chính mình."));
    const onChanged = vi.fn();
    render(<UserList users={users} onChanged={onChanged} />);
    await user.click(within(row("Bình")).getByRole("button", { name: /^Khóa/ }));
    await user.click(await screen.findByRole("button", { name: "Khóa tài khoản" }));
    expect(await screen.findByText("Bạn không thể khóa tài khoản của chính mình.")).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("signs in again after a session-expired answer and sends the disable once more", async () => {
    const user = userEvent.setup();
    requireReLogin.mockResolvedValue(undefined);
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Phiên đã hết hạn.", "session-expired"))
      .mockResolvedValueOnce(undefined);
    const onChanged = vi.fn();
    render(<UserList users={users} onChanged={onChanged} />);
    await user.click(within(row("Bình")).getByRole("button", { name: /^Khóa/ }));
    await user.click(await screen.findByRole("button", { name: "Khóa tài khoản" }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it("opens the reset dialog for that account", async () => {
    const user = userEvent.setup();
    render(<UserList users={users} onChanged={vi.fn()} />);
    await user.click(within(row("Bình")).getByRole("button", { name: /^Đặt lại mật khẩu/ }));
    expect(await screen.findByText(/Một mật khẩu tạm thời mới sẽ hiện ra một lần/)).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText(/binh@example.com/)).toBeInTheDocument();
  });

  it("shows the role of each person and when two-factor login must be set up again", () => {
    const list = [
      account({ id: 1, displayName: "An", role: "OWNER" }),
      account({ id: 2, displayName: "Bình", email: "binh@example.com", mustSetupTotp: true }),
    ];
    render(<UserList users={list} onChanged={vi.fn()} />);
    expect(within(row("An")).getByText("Chủ")).toBeInTheDocument();
    expect(within(row("Bình")).getByText("Người nhà")).toBeInTheDocument();
    expect(within(row("Bình")).getByText("Cần bật lại 2 lớp")).toBeInTheDocument();
  });

  it("asks before it makes a member an owner, then posts the role", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<UserList users={users} onChanged={onChanged} />);
    await user.click(within(row("Bình")).getByRole("button", { name: "Cho làm Chủ: Bình" }));
    expect(posts()).toHaveLength(0);
    await user.click(await screen.findByRole("button", { name: "Cho làm Chủ" }));
    await waitFor(() => expect(posts()).toEqual([["/admin/users/2/role", { role: "OWNER" }]]));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("asks before an owner steps back to member, and offers it only while another owner is active", async () => {
    const user = userEvent.setup();
    const twoOwners = [
      account({ id: 1, displayName: "An", role: "OWNER" }),
      account({ id: 2, displayName: "Bình", email: "binh@example.com", role: "OWNER" }),
    ];
    const { unmount } = render(<UserList users={twoOwners} onChanged={vi.fn()} />);
    await user.click(within(row("Bình")).getByRole("button", { name: "Thôi làm Chủ: Bình" }));
    expect(await screen.findByText(/Bình sẽ thành Người nhà/)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Thôi làm Chủ" }));
    await waitFor(() => expect(posts()).toEqual([["/admin/users/2/role", { role: "MEMBER" }]]));
    unmount();

    const oneOwner = [
      account({ id: 1, displayName: "An", role: "OWNER" }),
      account({ id: 2, displayName: "Bình", email: "binh@example.com" }),
      account({ id: 3, displayName: "Chi", email: "chi@example.com", role: "OWNER", enabled: false }),
    ];
    render(<UserList users={oneOwner} onChanged={vi.fn()} />);
    // An is the only active owner: the family must keep one.
    expect(within(row("An")).queryByRole("button", { name: /làm Chủ/ })).not.toBeInTheDocument();
  });

  it("offers to switch off two-factor login only for another person who has it, and asks first", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    const list = [
      account({ id: 1, displayName: "An", role: "OWNER", totpEnabled: true }),
      account({ id: 2, displayName: "Bình", email: "binh@example.com", totpEnabled: true }),
      account({ id: 3, displayName: "Chi", email: "chi@example.com" }),
    ];
    render(<UserList users={list} onChanged={onChanged} />);
    expect(within(row("An")).queryByRole("button", { name: /^Tắt xác thực 2 lớp/ })).not.toBeInTheDocument();
    expect(within(row("Chi")).queryByRole("button", { name: /^Tắt xác thực 2 lớp/ })).not.toBeInTheDocument();
    await user.click(within(row("Bình")).getByRole("button", { name: "Tắt xác thực 2 lớp của Bình" }));
    const dialog = await screen.findByRole("dialog", { name: "Tắt xác thực 2 lớp" });
    await user.click(within(dialog).getByRole("button", { name: "Tắt 2 lớp và đặt mật khẩu tạm" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe("/admin/users/2/disable-totp");
    expect(posts()[0][1]).toMatchObject({ temporaryPassword: expect.any(String) });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("opens the create dialog", async () => {
    const user = userEvent.setup();
    render(<UserList users={users} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Thêm người nhà" }));
    expect(await screen.findByLabelText(/^Tên hiển thị/)).toBeInTheDocument();
  });
});
