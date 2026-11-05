import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordReveal } from "./PasswordReveal";

function setShare(share: ((value: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "share", { value: share, configurable: true, writable: true });
}

afterEach(() => {
  setShare(undefined);
  vi.restoreAllMocks();
});

const MESSAGE = [
  "Tài khoản quản trị Nếp Nhà",
  "Email: an@example.com",
  "Mật khẩu tạm: lua-vang-mua-gat-27",
  `Đăng nhập ở ${window.location.origin}/admin/dang-nhap rồi đặt mật khẩu mới.`,
].join("\n");

describe("PasswordReveal", () => {
  it("shows the password with the reminder and copies it", async () => {
    const user = userEvent.setup();
    render(<PasswordReveal password="Abcdefghjk234567" email="an@example.com" />);
    expect(screen.getByText("Abcdefghjk234567")).toBeInTheDocument();
    expect(screen.getByText("Gửi riêng cho người nhà; họ phải đổi ở lần đăng nhập đầu.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    expect(await navigator.clipboard.readText()).toBe("Abcdefghjk234567");
    expect(await screen.findByText("Đã sao chép mật khẩu.")).toBeInTheDocument();
  });

  it("says so when the browser refuses to copy, and keeps the password visible", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<PasswordReveal password="Abcdefghjk234567" email="an@example.com" />);
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    expect(await screen.findByText(/Không sao chép được/)).toBeInTheDocument();
    expect(screen.getByText("Abcdefghjk234567")).toBeInTheDocument();
  });

  it("says so when the browser has no clipboard", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<PasswordReveal password="Abcdefghjk234567" email="an@example.com" />);
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    expect(await screen.findByText(/Không sao chép được/)).toBeInTheDocument();
  });

  it("does not write the password to the URL, to storage or to the console", async () => {
    const user = userEvent.setup();
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    render(<PasswordReveal password="Abcdefghjk234567" email="an@example.com" />);
    await user.click(screen.getByRole("button", { name: "Sao chép" }));
    expect(window.location.href).not.toContain("Abcdefghjk234567");
    expect(JSON.stringify({ ...localStorage })).not.toContain("Abcdefghjk234567");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("Abcdefghjk234567");
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
  it("sends the email, the password and the sign-in address through the share sheet with Gửi qua Zalo", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    render(<PasswordReveal password="lua-vang-mua-gat-27" email="an@example.com" />);
    await user.click(screen.getByRole("button", { name: "Gửi qua Zalo" }));
    expect(share).toHaveBeenCalledWith({ title: "Mật khẩu tạm Nếp Nhà", text: MESSAGE });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("copies the same message and says to paste it in Zalo when the device has no share sheet", async () => {
    const user = userEvent.setup();
    render(<PasswordReveal password="lua-vang-mua-gat-27" email="an@example.com" />);
    await user.click(screen.getByRole("button", { name: "Gửi qua Zalo" }));
    expect(await navigator.clipboard.readText()).toBe(MESSAGE);
    expect(await screen.findByRole("status")).toHaveTextContent("Đã sao chép lời nhắn. Mở Zalo và dán vào tin nhắn cho người nhà.");
  });

  it("says nothing when the share sheet is closed without sending", async () => {
    const user = userEvent.setup();
    setShare(vi.fn().mockRejectedValue(new DOMException("closed", "AbortError")));
    render(<PasswordReveal password="lua-vang-mua-gat-27" email="an@example.com" />);
    await user.click(screen.getByRole("button", { name: "Gửi qua Zalo" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});
