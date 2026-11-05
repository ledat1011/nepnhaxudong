import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordReveal } from "./PasswordReveal";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PasswordReveal", () => {
  it("shows the password with the reminder and copies it", async () => {
    const user = userEvent.setup();
    render(<PasswordReveal password="Abcdefghjk234567" />);
    expect(screen.getByText("Abcdefghjk234567")).toBeInTheDocument();
    expect(screen.getByText("Gửi riêng cho người nhà; họ phải đổi ở lần đăng nhập đầu.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    expect(await navigator.clipboard.readText()).toBe("Abcdefghjk234567");
    expect(await screen.findByText("Đã sao chép mật khẩu.")).toBeInTheDocument();
  });

  it("says so when the browser refuses to copy, and keeps the password visible", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<PasswordReveal password="Abcdefghjk234567" />);
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    expect(await screen.findByText(/Không sao chép được/)).toBeInTheDocument();
    expect(screen.getByText("Abcdefghjk234567")).toBeInTheDocument();
  });

  it("says so when the browser has no clipboard", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<PasswordReveal password="Abcdefghjk234567" />);
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    expect(await screen.findByText(/Không sao chép được/)).toBeInTheDocument();
  });

  it("does not write the password to the URL, to storage or to the console", async () => {
    const user = userEvent.setup();
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    render(<PasswordReveal password="Abcdefghjk234567" />);
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    expect(window.location.href).not.toContain("Abcdefghjk234567");
    expect(JSON.stringify({ ...localStorage })).not.toContain("Abcdefghjk234567");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("Abcdefghjk234567");
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
