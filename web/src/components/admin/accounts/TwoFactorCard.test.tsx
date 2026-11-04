import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { TotpSetupResponse } from "@/lib/admin/types";

const { adminFetch, requireReLogin, refresh } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin, refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { TwoFactorCard } from "./TwoFactorCard";

const setup: TotpSetupResponse = {
  secret: "JBSWY3DPEHPK3PXP",
  otpauthUri: "otpauth://totp/Nep%20Nha:me%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Nep%20Nha",
};

function calls(path: string) {
  return adminFetch.mock.calls.filter(([p]) => p === path);
}

function respond(overrides: Record<string, unknown> = {}) {
  adminFetch.mockImplementation(async (path: string) => {
    if (path in overrides) {
      const value = overrides[path];
      if (value instanceof Error) throw value;
      return value;
    }
    if (path === "/admin/me/totp/setup") return setup;
    return undefined;
  });
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  refresh.mockReset();
  refresh.mockResolvedValue(undefined);
  respond();
});

describe("TwoFactorCard (switched off)", () => {
  it("shows a QR image and the secret after setup, and nothing before", async () => {
    const user = userEvent.setup();
    const { container } = render(<TwoFactorCard enabled={false} onChanged={vi.fn()} />);
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.queryByText(setup.secret)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    const qr = await screen.findByRole("img", { name: /Mã QR/ });
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(qr.querySelector("path")).not.toBeNull();
    expect(screen.getByText(setup.secret)).toBeInTheDocument();
    expect(calls("/admin/me/totp/setup")[0][1]).toMatchObject({ method: "POST" });
  });

  it("shows the API text for a wrong code and keeps the secret so the user can try again", async () => {
    const user = userEvent.setup();
    respond({ "/admin/me/totp/enable": new AdminApiError(400, "Mã xác thực không đúng.") });
    const onChanged = vi.fn();
    render(<TwoFactorCard enabled={false} onChanged={onChanged} />);
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    await screen.findByText(setup.secret);
    await user.type(screen.getByLabelText("Mã 6 số"), "000000");
    await user.click(screen.getByRole("button", { name: "Xác nhận và bật" }));
    expect(await screen.findByText("Mã xác thực không đúng.")).toBeInTheDocument();
    expect(screen.getByText(setup.secret)).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sends the trimmed code, clears the secret and the QR, and refreshes the session", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    const { container } = render(<TwoFactorCard enabled={false} onChanged={onChanged} />);
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    await screen.findByText(setup.secret);
    await user.type(screen.getByLabelText("Mã 6 số"), " 123456 ");
    await user.click(screen.getByRole("button", { name: "Xác nhận và bật" }));
    await waitFor(() => expect(calls("/admin/me/totp/enable")).toHaveLength(1));
    expect(calls("/admin/me/totp/enable")[0][1]).toEqual({ method: "POST", body: { code: "123456" } });
    await waitFor(() => expect(screen.queryByText(setup.secret)).not.toBeInTheDocument());
    expect(container.querySelector("svg")).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Đang bật")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tắt xác thực 2 lớp" })).toBeInTheDocument();
  });

  it("throws the secret away on Hủy", async () => {
    const user = userEvent.setup();
    const { container } = render(<TwoFactorCard enabled={false} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    await screen.findByText(setup.secret);
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.queryByText(setup.secret)).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByRole("button", { name: "Bật xác thực 2 lớp" })).toBeInTheDocument();
  });

  it("signs in again after a session-expired answer and shows the secret of the second answer", async () => {
    const user = userEvent.setup();
    requireReLogin.mockResolvedValue(undefined);
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Phiên đã hết hạn.", "session-expired"))
      .mockResolvedValueOnce(setup);
    render(<TwoFactorCard enabled={false} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    expect(await screen.findByText(setup.secret)).toBeInTheDocument();
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(calls("/admin/me/totp/setup")).toHaveLength(2);
  });

  it("keeps the secret out of the URL, the storage and the console", async () => {
    const user = userEvent.setup();
    const log = vi.spyOn(console, "log");
    render(<TwoFactorCard enabled={false} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    await screen.findByText(setup.secret);
    expect(window.location.href).not.toContain(setup.secret);
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain(setup.secret);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("does not send a code that is not 6 digits", async () => {
    const user = userEvent.setup();
    render(<TwoFactorCard enabled={false} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Bật xác thực 2 lớp" }));
    await screen.findByText(setup.secret);
    await user.type(screen.getByLabelText("Mã 6 số"), "12ab");
    expect(screen.getByRole("button", { name: "Xác nhận và bật" })).toBeDisabled();
  });
});

describe("TwoFactorCard (switched on)", () => {
  it("asks for a code to switch it off and refreshes the session", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<TwoFactorCard enabled onChanged={onChanged} />);
    expect(screen.getByText("Đang bật")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tắt xác thực 2 lớp" }));
    await user.type(screen.getByLabelText("Mã 6 số"), "654321");
    await user.click(screen.getByRole("button", { name: "Xác nhận và tắt" }));
    await waitFor(() => expect(calls("/admin/me/totp/disable")).toHaveLength(1));
    expect(calls("/admin/me/totp/disable")[0][1]).toEqual({ method: "POST", body: { code: "654321" } });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Chưa bật")).toBeInTheDocument();
  });

  it("shows the API text for a wrong code", async () => {
    const user = userEvent.setup();
    respond({ "/admin/me/totp/disable": new AdminApiError(400, "Mã xác thực không đúng.") });
    render(<TwoFactorCard enabled onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Tắt xác thực 2 lớp" }));
    await user.type(screen.getByLabelText("Mã 6 số"), "111111");
    await user.click(screen.getByRole("button", { name: "Xác nhận và tắt" }));
    expect(await screen.findByText("Mã xác thực không đúng.")).toBeInTheDocument();
    expect(screen.getByText("Đang bật")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("TwoFactorCard link", () => {
  it("links to the change-password page", () => {
    render(<TwoFactorCard enabled={false} onChanged={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Đổi mật khẩu" })).toHaveAttribute("href", "/admin/doi-mat-khau");
  });
});
