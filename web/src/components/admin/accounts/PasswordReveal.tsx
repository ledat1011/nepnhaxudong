"use client";

import { useState } from "react";
import { Button } from "@/components/admin/ui/button";

const REMINDER = "Gửi riêng cho người nhà; họ phải đổi ở lần đăng nhập đầu.";
const COPIED_MESSAGE = "Đã sao chép mật khẩu.";
const COPY_FAILED_MESSAGE = "Không sao chép được. Hãy chọn mật khẩu ở trên và chép bằng tay.";

/** Shows a temporary password once, with a copy button. The password lives only in the props of this render. */
export function PasswordReveal({ password }: { password: string }) {
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">Mật khẩu tạm thời</p>
      <code className="block select-all break-all rounded-md border bg-muted p-3 font-mono text-base">{password}</code>
      <p className="text-sm text-muted-foreground">{REMINDER}</p>
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
