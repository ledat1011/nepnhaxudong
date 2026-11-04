"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { adminFetch } from "@/lib/admin/api";
import { resetCsrfToken } from "@/lib/admin/csrf";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";

const MIN_PASSWORD_LENGTH = 12;
const TOO_SHORT_MESSAGE = `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
const MISMATCH_MESSAGE = "Hai mật khẩu mới không khớp.";

/**
 * Used for the forced change after the first sign-in (the user has only a temporary password)
 * and for a change the user starts. Both need a session.
 */
export function ChangePasswordForm() {
  const router = useRouter();
  const { status, refresh } = useAdminSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const [repeatError, setRepeatError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "signed-out") router.replace(ADMIN_ROUTES.login);
  }, [status, router]);

  if (status === "loading" || status === "signed-out") {
    return (
      <p role="status" className="p-4 text-muted-foreground">
        Đang tải…
      </p>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const tooShort = newPassword.length < MIN_PASSWORD_LENGTH;
    const mismatch = !tooShort && newPassword !== repeat;
    setNewError(tooShort ? TOO_SHORT_MESSAGE : null);
    setRepeatError(mismatch ? MISMATCH_MESSAGE : null);
    if (tooShort || mismatch) return;

    setPending(true);
    try {
      await adminFetch("/auth/password", { method: "POST", body: { currentPassword, newPassword } });
      // The API issues a new CSRF token after a password change.
      resetCsrfToken();
      await refresh();
      router.replace(ADMIN_ROUTES.home);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.detail : GENERIC_ERROR_MESSAGE);
      setPending(false);
    }
  }

  const forced = status === "must-change-password";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Đổi mật khẩu</h1>
      {forced && (
        <p className="text-muted-foreground">
          Bạn đang dùng mật khẩu tạm. Hãy đặt mật khẩu mới trước khi tiếp tục.
        </p>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">Mật khẩu hiện tại</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">Mật khẩu mới</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            aria-invalid={newError ? true : undefined}
            aria-describedby={newError ? "new-password-error" : "new-password-hint"}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          {newError ? (
            <p id="new-password-error" role="alert" className="text-sm text-destructive">
              {newError}
            </p>
          ) : (
            <p id="new-password-hint" className="text-sm text-muted-foreground">
              Ít nhất {MIN_PASSWORD_LENGTH} ký tự.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repeat-password">Nhập lại mật khẩu mới</Label>
          <Input
            id="repeat-password"
            type="password"
            autoComplete="new-password"
            value={repeat}
            aria-invalid={repeatError ? true : undefined}
            aria-describedby={repeatError ? "repeat-password-error" : undefined}
            onChange={(event) => setRepeat(event.target.value)}
          />
          {repeatError && (
            <p id="repeat-password-error" role="alert" className="text-sm text-destructive">
              {repeatError}
            </p>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Đổi mật khẩu"}
        </Button>
        {!forced && (
          <Button asChild variant="outline">
            <Link href={ADMIN_ROUTES.home}>Quay lại</Link>
          </Button>
        )}
      </form>
    </main>
  );
}
