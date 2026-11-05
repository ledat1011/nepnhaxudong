import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { UserResponse } from "@/lib/admin/types";

const { adminFetch, resetCsrfToken } = vi.hoisted(() => ({ adminFetch: vi.fn(), resetCsrfToken: vi.fn() }));

vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/csrf", () => ({ resetCsrfToken }));

import { LoginForm } from "./LoginForm";

const user: UserResponse = {
  id: 1,
  email: "an@example.com",
  displayName: "An",
  mustChangePassword: false,
  role: "OWNER",
  totpEnabled: false,
  mustSetupTotp: false,
  totpRequired: false,
};

beforeEach(() => {
  adminFetch.mockReset();
  resetCsrfToken.mockReset();
});

async function fill(events: ReturnType<typeof userEvent.setup>) {
  await events.type(screen.getByLabelText("Email"), "An@Example.com ");
  await events.type(screen.getByLabelText("Mật khẩu"), "secret-password");
}

describe("LoginForm", () => {
  it("signs in, trims and lower-cases the email, resets the CSRF token and reports the user", async () => {
    adminFetch.mockResolvedValueOnce(user);
    const onSuccess = vi.fn();
    const events = userEvent.setup();
    render(<LoginForm onSuccess={onSuccess} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(user));
    expect(adminFetch).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: { email: "an@example.com", password: "secret-password" },
    });
    expect(resetCsrfToken).toHaveBeenCalled();
  });

  it("does not show the code field at first", () => {
    render(<LoginForm onSuccess={vi.fn()} />);
    expect(screen.queryByLabelText("Mã xác thực")).not.toBeInTheDocument();
  });

  it("on totp-required shows the code field, keeps email and password and sends all three next time", async () => {
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Cần mã xác thực.", "totp-required"))
      .mockResolvedValueOnce(user);
    const onSuccess = vi.fn();
    const events = userEvent.setup();
    render(<LoginForm onSuccess={onSuccess} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));

    const code = await screen.findByLabelText("Mã xác thực");
    expect(screen.getByLabelText("Email")).toHaveValue("An@Example.com ");
    expect(screen.getByLabelText("Mật khẩu")).toHaveValue("secret-password");
    expect(onSuccess).not.toHaveBeenCalled();

    await events.type(code, "123456");
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(user));
    expect(adminFetch).toHaveBeenLastCalledWith("/auth/login", {
      method: "POST",
      body: { email: "an@example.com", password: "secret-password", totpCode: "123456" },
    });
  });

  it("on totp-invalid shows the detail next to the code field and keeps the field", async () => {
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Cần mã xác thực.", "totp-required"))
      .mockRejectedValueOnce(new AdminApiError(401, "Mã xác thực không đúng.", "totp-invalid"));
    const events = userEvent.setup();
    render(<LoginForm onSuccess={vi.fn()} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await events.type(await screen.findByLabelText("Mã xác thực"), "000000");
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByText("Mã xác thực không đúng.")).toBeInTheDocument();
    expect(screen.getByLabelText("Mã xác thực")).toHaveAccessibleDescription("Mã xác thực không đúng.");
  });

  it("shows the detail of a locked account (423)", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(423, "Tài khoản bị khóa 15 phút.", "account-locked"));
    const events = userEvent.setup();
    render(<LoginForm onSuccess={vi.fn()} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tài khoản bị khóa 15 phút.");
  });

  it("shows the detail of invalid credentials", async () => {
    adminFetch.mockRejectedValueOnce(
      new AdminApiError(401, "Email hoặc mật khẩu không đúng.", "invalid-credentials"),
    );
    const events = userEvent.setup();
    render(<LoginForm onSuccess={vi.fn()} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email hoặc mật khẩu không đúng.");
    expect(resetCsrfToken).not.toHaveBeenCalled();
  });

  it("prefills the email when a default is given", () => {
    render(<LoginForm onSuccess={vi.fn()} defaultEmail="an@example.com" />);
    expect(screen.getByLabelText("Email")).toHaveValue("an@example.com");
  });
});
