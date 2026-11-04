import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { ResetPasswordRequest, UserSummary } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { ResetPasswordDialog } from "./ResetPasswordDialog";

const target: UserSummary = {
  id: 4,
  email: "binh@example.com",
  displayName: "Bình",
  enabled: true,
  totpEnabled: true,
  mustChangePassword: false,
};

const PASSWORD_TEXT = /^[A-Za-z2-9]{16}$/;

function resets(): { path: string; body: ResetPasswordRequest }[] {
  return adminFetch.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([path, init]) => ({ path: path as string, body: init.body as ResetPasswordRequest }));
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  adminFetch.mockResolvedValue(undefined);
});

describe("ResetPasswordDialog", () => {
  it("warns that two-factor login is switched off, and shows no password before the reset", () => {
    render(<ResetPasswordDialog user={target} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("Thao tác này cũng tắt xác thực 2 lớp của người này.")).toBeInTheDocument();
    expect(screen.queryByText(PASSWORD_TEXT)).not.toBeInTheDocument();
  });

  it("posts a new 16-character password for that user and then shows it once", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ResetPasswordDialog user={target} onClose={vi.fn()} onDone={onDone} />);
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    await waitFor(() => expect(resets()).toHaveLength(1));
    expect(resets()[0].path).toBe("/admin/users/4/reset-password");
    const password = resets()[0].body.temporaryPassword;
    expect(password).toMatch(PASSWORD_TEXT);
    expect(await screen.findByText(password)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sao chép" })).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows the API text and no password when the reset fails", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValue(new AdminApiError(404, "Không tìm thấy tài khoản."));
    render(<ResetPasswordDialog user={target} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(await screen.findByText("Không tìm thấy tài khoản.")).toBeInTheDocument();
    expect(screen.queryByText(PASSWORD_TEXT)).not.toBeInTheDocument();
  });

  it("signs in again after a session-expired answer and shows the password the server accepted", async () => {
    const user = userEvent.setup();
    requireReLogin.mockResolvedValue(undefined);
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Phiên đã hết hạn.", "session-expired"))
      .mockResolvedValueOnce(undefined);
    render(<ResetPasswordDialog user={target} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    await waitFor(() => expect(resets()).toHaveLength(2));
    expect(resets()[1].body).toEqual(resets()[0].body);
    expect(await screen.findByText(resets()[1].body.temporaryPassword)).toBeInTheDocument();
  });

  it("drops the password when the dialog closes and makes a new one on the next open", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ResetPasswordDialog user={target} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    await waitFor(() => expect(resets()).toHaveLength(1));
    const first = resets()[0].body.temporaryPassword;
    expect(await screen.findByText(first)).toBeInTheDocument();

    rerender(<ResetPasswordDialog user={null} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByText(first)).not.toBeInTheDocument();

    rerender(<ResetPasswordDialog user={target} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByText(first)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    await waitFor(() => expect(resets()).toHaveLength(2));
    expect(resets()[1].body.temporaryPassword).not.toBe(first);
  });

  it("asks the parent to close from Hủy and from Xong", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ResetPasswordDialog user={target} onClose={onClose} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    await user.click(await screen.findByRole("button", { name: "Xong" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
