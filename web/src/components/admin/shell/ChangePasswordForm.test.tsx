import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";

const { adminFetch, replace, refresh, resetCsrfToken, signOut, session } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  resetCsrfToken: vi.fn(),
  signOut: vi.fn(),
  session: { status: "must-change-password" as string },
}));

vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/csrf", () => ({ resetCsrfToken }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ status: session.status, refresh, signOut }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { ChangePasswordForm } from "./ChangePasswordForm";

async function fill(events: ReturnType<typeof userEvent.setup>, current: string, next: string, again: string) {
  if (current !== "") await events.type(screen.getByLabelText(/^Mật khẩu hiện tại/), current);
  await events.type(screen.getByLabelText(/^Mật khẩu mới/), next);
  await events.type(screen.getByLabelText(/^Nhập lại mật khẩu mới/), again);
  await events.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
}

beforeEach(() => {
  adminFetch.mockReset();
  replace.mockReset();
  refresh.mockReset();
  refresh.mockResolvedValue(undefined);
  resetCsrfToken.mockReset();
  signOut.mockReset();
  session.status = "must-change-password";
});

describe("ChangePasswordForm", () => {
  it("rejects a new password of 11 characters in the browser and does not call the API", async () => {
    const events = userEvent.setup();
    render(<ChangePasswordForm />);
    await fill(events, "temp-password", "12345678901", "12345678901");
    expect(await screen.findByText("Mật khẩu mới phải có ít nhất 12 ký tự.")).toBeInTheDocument();
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("rejects a repeat that does not match and does not call the API", async () => {
    const events = userEvent.setup();
    render(<ChangePasswordForm />);
    await fill(events, "temp-password", "123456789012", "123456789013");
    expect(await screen.findByText("Hai mật khẩu mới không khớp.")).toBeInTheDocument();
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("accepts exactly 12 characters, then resets the CSRF token, refreshes and goes home", async () => {
    adminFetch.mockResolvedValueOnce(undefined);
    const events = userEvent.setup();
    render(<ChangePasswordForm />);
    await fill(events, "temp-password", "123456789012", "123456789012");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
    expect(adminFetch).toHaveBeenCalledWith("/auth/password", {
      method: "POST",
      body: { currentPassword: "temp-password", newPassword: "123456789012" },
    });
    expect(resetCsrfToken).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the detail of an API error and stays on the page", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    const events = userEvent.setup();
    render(<ChangePasswordForm />);
    await fill(events, "wrong", "123456789012", "123456789012");
    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ đang bận.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("puts a wrong current password under the current password box and moves there", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(400, "Mật khẩu hiện tại không đúng."));
    const events = userEvent.setup();
    render(<ChangePasswordForm />);
    await fill(events, "wrong", "123456789012", "123456789012");
    const current = screen.getByLabelText(/^Mật khẩu hiện tại/);
    await waitFor(() => expect(current).toHaveFocus());
    expect(current).toHaveAttribute("aria-invalid", "true");
    expect(current).toHaveAccessibleDescription("Mật khẩu hiện tại không đúng.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("marks the three boxes with *, and asks for the current password before it calls the API", async () => {
    const events = userEvent.setup();
    render(<ChangePasswordForm />);
    expect(screen.getByText("Ô có dấu * là ô phải điền.")).toBeInTheDocument();
    await fill(events, "", "123456789012", "123456789012");
    const current = screen.getByLabelText(/^Mật khẩu hiện tại/);
    expect(current).toBeRequired();
    expect(current).toHaveAccessibleDescription("Mật khẩu hiện tại không được để trống.");
    await waitFor(() => expect(current).toHaveFocus());
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("moves the cursor to the new password when it is too short", async () => {
    const events = userEvent.setup();
    render(<ChangePasswordForm />);
    await fill(events, "temp-password", "short", "short");
    await waitFor(() => expect(screen.getByLabelText(/^Mật khẩu mới/)).toHaveFocus());
  });

  it("explains the forced case and does not show the bottom nav", () => {
    render(<ChangePasswordForm />);
    expect(screen.getByText(/mật khẩu tạm/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("goes to the login page when nobody is signed in", async () => {
    session.status = "signed-out";
    render(<ChangePasswordForm />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/dang-nhap"));
    expect(screen.queryByLabelText(/^Mật khẩu mới/)).not.toBeInTheDocument();
  });

  it("shows no form while the session is loading", () => {
    session.status = "loading";
    render(<ChangePasswordForm />);
    expect(screen.queryByLabelText(/^Mật khẩu mới/)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("offers a sign-out button in the forced case so the user is never stuck", async () => {
    render(<ChangePasswordForm />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("works for a voluntary change of a signed-in user", () => {
    session.status = "ready";
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText(/^Mật khẩu mới/)).toBeInTheDocument();
    expect(screen.queryByText(/mật khẩu tạm/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đăng xuất" })).not.toBeInTheDocument();
  });
});
