import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { CreateUserRequest, UserSummary } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { CreateUserDialog } from "./CreateUserDialog";

const created: UserSummary = {
  id: 9,
  email: "me@example.com",
  displayName: "Me",
  enabled: true,
  totpEnabled: false,
  mustChangePassword: true,
  role: "MEMBER",
  mustSetupTotp: false,
};

const PASSWORD_TEXT = /^[A-Za-z2-9]{16}$/;

function posts(): CreateUserRequest[] {
  return adminFetch.mock.calls
    .filter(([path, init]) => path === "/admin/users" && init?.method === "POST")
    .map(([, init]) => init.body as CreateUserRequest);
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Email/), "  Me@Example.COM ");
  await user.type(screen.getByLabelText(/^Tên hiển thị/), "  Me ");
  await user.click(screen.getByRole("button", { name: "Tạo mật khẩu" }));
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  adminFetch.mockResolvedValue(created);
});

describe("CreateUserDialog", () => {
  it("sends the email trimmed and in lower case, and shows the password only after the account exists", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={onCreated} />);
    await fill(user);
    // The generated password is in the hidden field, not in the text of the page.
    expect(screen.getByLabelText(/^Mật khẩu tạm thời/)).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    const body = posts()[0];
    expect(body.email).toBe("me@example.com");
    expect(body.displayName).toBe("Me");
    expect(body.temporaryPassword).toMatch(PASSWORD_TEXT);
    expect(await screen.findByText(body.temporaryPassword)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sao chép" })).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("does not show a password when the API refuses, and shows the API text", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValue(new AdminApiError(409, "Email đã được dùng."));
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(await screen.findByText("Email đã được dùng.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Mật khẩu tạm thời/)).toHaveAttribute("type", "password");
    expect(document.body.textContent).not.toContain(posts()[0].temporaryPassword);
    expect(screen.queryByRole("button", { name: "Sao chép" })).not.toBeInTheDocument();
  });

  it("puts each of several joined API messages under its own box", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValue(new AdminApiError(400, "Email quá dài. Tên hiển thị quá dài."));
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await waitFor(() => expect(screen.getByLabelText(/^Email/)).toHaveAccessibleDescription("Email quá dài."));
    expect(screen.getByLabelText(/^Tên hiển thị/)).toHaveAccessibleDescription("Tên hiển thị quá dài.");
  });

  it("keeps password managers from offering to save the temporary password", () => {
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    const field = screen.getByLabelText(/^Mật khẩu tạm thời/);
    expect(field).toHaveAttribute("autocomplete", "off");
    expect(field).toHaveAttribute("data-1p-ignore");
    expect(field).toHaveAttribute("data-lpignore", "true");
  });

  it("reloads the list after a failure that is not a 400, because the account may exist", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    adminFetch.mockRejectedValue(new AdminApiError(503, "Máy chủ đang bận."));
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={onCreated} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(await screen.findByText("Máy chủ đang bận.")).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("does not reload the list after a 400", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    adminFetch.mockRejectedValue(new AdminApiError(400, "Email không hợp lệ."));
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={onCreated} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(await screen.findByText("Email không hợp lệ.")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("hints at Đặt lại mật khẩu when the email is already used", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValue(new AdminApiError(409, "Email đã được dùng."));
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(await screen.findByText(/có thể đã có rồi/)).toBeInTheDocument();
  });

  it("clears the password from the state when the dialog closes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    const password = posts()[0].temporaryPassword;
    expect(await screen.findByText(password)).toBeInTheDocument();

    rerender(<CreateUserDialog open={false} onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByText(password)).not.toBeInTheDocument();

    rerender(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.queryByText(password)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveValue("");
    expect(screen.getByLabelText(/^Mật khẩu tạm thời/)).toHaveValue("");
  });

  it("asks the parent to close after Xong", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CreateUserDialog open onOpenChange={onOpenChange} onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await user.click(await screen.findByRole("button", { name: "Xong" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes without a question after the account was created", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CreateUserDialog open onOpenChange={onOpenChange} onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await screen.findByRole("button", { name: "Xong" });
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("refuses a password under 12 characters under the password box, and sends nothing", async () => {
    const user = userEvent.setup();
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await user.type(screen.getByLabelText(/^Email/), "a@b.vn");
    await user.type(screen.getByLabelText(/^Tên hiển thị/), "An");
    const password = screen.getByLabelText(/^Mật khẩu tạm thời/);
    await user.type(password, "short");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(password).toHaveAccessibleDescription(/^Mật khẩu tạm thời phải có ít nhất 12 ký tự\./);
    await waitFor(() => expect(password).toHaveFocus());
    expect(posts()).toHaveLength(0);
    await user.type(password, "-long-enough");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
  });

  it("marks every box with * and shows what is missing under each empty box", async () => {
    const user = userEvent.setup();
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByText("Ô có dấu * là ô phải điền.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    const email = screen.getByLabelText(/^Email/);
    expect(email).toHaveAccessibleDescription("Email không được để trống.");
    expect(screen.getByLabelText(/^Tên hiển thị/)).toHaveAccessibleDescription("Tên hiển thị không được để trống.");
    expect(screen.getByLabelText(/^Mật khẩu tạm thời/)).toHaveAccessibleDescription(
      /^Mật khẩu tạm thời không được để trống\./,
    );
    await waitFor(() => expect(email).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa lưu. Hãy sửa ô có viền đỏ.");
  });

  it("puts the API message about the email under the email box", async () => {
    const user = userEvent.setup();
    adminFetch.mockRejectedValue(new AdminApiError(400, "Email không hợp lệ."));
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    const email = screen.getByLabelText(/^Email/);
    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAccessibleDescription("Email không hợp lệ.");
  });

  it("signs in again after a session-expired answer, then sends the same request once more and shows the accepted password", async () => {
    const user = userEvent.setup();
    requireReLogin.mockResolvedValue(undefined);
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Phiên đã hết hạn.", "session-expired"))
      .mockResolvedValueOnce(created);
    render(<CreateUserDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(posts()[1]).toEqual(posts()[0]);
    expect(await screen.findByText(posts()[1].temporaryPassword)).toBeInTheDocument();
  });

  it("asks before it drops what was typed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CreateUserDialog open onOpenChange={onOpenChange} onCreated={vi.fn()} />);
    await user.type(screen.getByLabelText(/^Email/), "a@b.vn");
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Bỏ thay đổi" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes at once when nothing was typed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CreateUserDialog open onOpenChange={onOpenChange} onCreated={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Đóng" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
