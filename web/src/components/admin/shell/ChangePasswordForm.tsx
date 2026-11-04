"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { adminFetch } from "@/lib/admin/api";
import { resetCsrfToken } from "@/lib/admin/csrf";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { mapApiDetail, type FieldRule } from "@/lib/admin/field-errors";
import { useFieldErrors } from "@/lib/admin/use-field-errors";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import { SessionErrorScreen } from "./SessionErrorScreen";
import { FieldError, RequiredMark, RequiredNote } from "@/components/admin/form/FieldError";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";

const MIN_PASSWORD_LENGTH = 12;
const TOO_SHORT_MESSAGE = `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
const MISMATCH_MESSAGE = "Hai mật khẩu mới không khớp.";
const CURRENT_MISSING_MESSAGE = "Mật khẩu hiện tại không được để trống.";

/** The API messages that name a field of this form (see `ChangePasswordRequest` and the auth service). */
const FIELD_RULES: FieldRule[] = [
  { prefix: "Mật khẩu hiện tại", field: "current" },
  { prefix: "Mật khẩu mới", field: "new" },
];

/**
 * Used for the forced change after the first sign-in (the user has only a temporary password)
 * and for a change the user starts. Both need a session.
 */
export function ChangePasswordForm() {
  const router = useRouter();
  const { status, refresh, signOut } = useAdminSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const fields = useFieldErrors();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "signed-out") router.replace(ADMIN_ROUTES.login);
  }, [status, router]);

  if (status === "error") return <SessionErrorScreen onRetry={refresh} />;

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
    fields.reset();
    const problems: Record<string, string> = {};
    if (currentPassword === "") problems.current = CURRENT_MISSING_MESSAGE;
    if (newPassword.length < MIN_PASSWORD_LENGTH) problems.new = TOO_SHORT_MESSAGE;
    else if (newPassword !== repeat) problems.repeat = MISMATCH_MESSAGE;
    fields.show(problems);
    if (Object.keys(problems).length > 0) return;

    setPending(true);
    try {
      await adminFetch("/auth/password", { method: "POST", body: { currentPassword, newPassword } });
      // The API issues a new CSRF token after a password change.
      resetCsrfToken();
      await refresh();
      router.replace(ADMIN_ROUTES.home);
    } catch (caught) {
      const detail = caught instanceof AdminApiError ? caught.detail : GENERIC_ERROR_MESSAGE;
      const { errors: mapped, rest } = mapApiDetail(detail, FIELD_RULES);
      // A message that names a box is shown under that box; any other message at the top of the form.
      if (Object.keys(mapped).length > 0) fields.showApi(detail, FIELD_RULES);
      setError(rest);
      setPending(false);
    }
  }

  const forced = status === "must-change-password";
  const currentError = fields.errors.current;
  const newError = fields.errors.new;
  const repeatError = fields.errors.repeat;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Đổi mật khẩu</h1>
      {forced && (
        <p className="text-muted-foreground">
          Bạn đang dùng mật khẩu tạm. Hãy đặt mật khẩu mới trước khi tiếp tục.
        </p>
      )}
      <form {...fields.rootProps} onSubmit={submit} noValidate className="flex flex-col gap-4">
        <RequiredNote />
        {error && (
          <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">
            Mật khẩu hiện tại
            <RequiredMark />
          </Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            aria-invalid={currentError ? true : undefined}
            aria-describedby={currentError ? "current-password-error" : undefined}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              fields.clear("current");
            }}
          />
          <FieldError id="current-password" message={currentError} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">
            Mật khẩu mới
            <RequiredMark />
          </Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            aria-invalid={newError ? true : undefined}
            aria-describedby={newError ? "new-password-error" : "new-password-hint"}
            onChange={(event) => {
              setNewPassword(event.target.value);
              fields.clear("new");
            }}
          />
          {newError ? (
            <FieldError id="new-password" message={newError} />
          ) : (
            <p id="new-password-hint" className="text-sm text-muted-foreground">
              Ít nhất {MIN_PASSWORD_LENGTH} ký tự.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repeat-password">
            Nhập lại mật khẩu mới
            <RequiredMark />
          </Label>
          <Input
            id="repeat-password"
            type="password"
            autoComplete="new-password"
            required
            value={repeat}
            aria-invalid={repeatError ? true : undefined}
            aria-describedby={repeatError ? "repeat-password-error" : undefined}
            onChange={(event) => {
              setRepeat(event.target.value);
              fields.clear("repeat");
            }}
          />
          <FieldError id="repeat-password" message={repeatError} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Đổi mật khẩu"}
        </Button>
        {forced && (
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Đăng xuất
          </Button>
        )}
        {!forced && (
          <Button asChild variant="outline">
            <Link href={ADMIN_ROUTES.home}>Quay lại</Link>
          </Button>
        )}
      </form>
    </main>
  );
}
