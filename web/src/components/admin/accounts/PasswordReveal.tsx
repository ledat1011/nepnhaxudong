"use client";

import { useState } from "react";
import { Button } from "@/components/admin/ui/button";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { shareOrCopy } from "@/lib/admin/share";

const REMINDER = "Gửi riêng cho người nhà; họ phải đổi ở lần đăng nhập đầu.";
const COPIED_MESSAGE = "Đã sao chép mật khẩu.";
const COPY_FAILED_MESSAGE = "Không sao chép được. Hãy chọn mật khẩu ở trên và chép bằng tay.";
const MESSAGE_COPIED = "Đã sao chép lời nhắn. Mở Zalo và dán vào tin nhắn cho người nhà.";

/** The message for the family member: who signs in, with what, and where. */
function messageFor(email: string, password: string): string {
  return [
    "Tài khoản quản trị Nếp Nhà",
    `Email: ${email}`,
    `Mật khẩu tạm: ${password}`,
    `Đăng nhập ở ${window.location.origin}${ADMIN_ROUTES.login} rồi đặt mật khẩu mới.`,
  ].join("\n");
}

/**
 * Shows a temporary password once, with "Gửi qua Zalo" (the share sheet of the phone, or a copy of the message) and a
 * copy button. The password lives only in the props of this render.
 */
export function PasswordReveal({ password, email }: { password: string; email: string }) {
  const [message, setMessage] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setMessage(COPIED_MESSAGE);
    } catch {
      // A missing clipboard (navigator.clipboard is undefined) and a refused write end here alike.
      setMessage(COPY_FAILED_MESSAGE);
    }
  }

  async function send() {
    setMessage(null);
    const result = await shareOrCopy({ title: "Mật khẩu tạm Nếp Nhà", text: messageFor(email, password) });
    if (result === "copied") setMessage(MESSAGE_COPIED);
    else if (result === "failed") setMessage(COPY_FAILED_MESSAGE);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">Mật khẩu tạm thời</p>
      <code className="block select-all break-all rounded-md border bg-muted p-3 font-mono text-base">{password}</code>
      <p className="text-sm text-muted-foreground">{REMINDER}</p>
      <Button type="button" onClick={() => void send()}>
        Gửi qua Zalo
      </Button>
      <Button type="button" variant="outline" onClick={() => void copy()}>
        Sao chép
      </Button>
      {message !== null ? (
        <p role="status" className="text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
