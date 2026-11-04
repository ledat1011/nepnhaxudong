"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { adminFetch } from "@/lib/admin/api";
import { resetCsrfToken } from "@/lib/admin/csrf";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import type { UserResponse } from "@/lib/admin/types";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";

const TOTP_REQUIRED = "totp-required";
const TOTP_INVALID = "totp-invalid";
const MISSING_FIELDS_MESSAGE = "Hãy nhập email và mật khẩu.";
const TOTP_HINT = "Nhập mã 6 số trong ứng dụng xác thực.";

type Props = {
  onSuccess(user: UserResponse): void;
  /** Pre-fills the email, for example when the session expired and the same user signs in again. */
  defaultEmail?: string;
  /** When given, a "Hủy" button is shown next to the submit button. */
  onCancel?(): void;
};

export function LoginForm({ onSuccess, defaultEmail = "", onCancel }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  // The code field appears only after the API asks for it. Email and password stay filled.
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const totpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (needTotp) totpRef.current?.focus();
  }, [needTotp]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setTotpError(null);
    if (email.trim() === "" || password === "") {
      setError(MISSING_FIELDS_MESSAGE);
      return;
    }
    setPending(true);
    try {
      const user = await adminFetch<UserResponse>("/auth/login", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          password,
          ...(needTotp ? { totpCode: totpCode.trim() } : {}),
        },
      });
      // The API issues a new CSRF token on sign-in.
      resetCsrfToken();
      onSuccess(user);
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.code === TOTP_REQUIRED) {
        setNeedTotp(true);
      } else if (caught instanceof AdminApiError && caught.code === TOTP_INVALID) {
        setNeedTotp(true);
        setTotpError(caught.detail);
      } else {
        setError(caught instanceof AdminApiError ? caught.detail : GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">Mật khẩu</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {needTotp && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-totp">Mã xác thực</Label>
          <Input
            id="login-totp"
            ref={totpRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={totpCode}
            aria-invalid={totpError ? true : undefined}
            aria-describedby={totpError ? "login-totp-error" : "login-totp-hint"}
            onChange={(event) => setTotpCode(event.target.value)}
          />
          {totpError ? (
            <p id="login-totp-error" role="alert" className="text-sm text-destructive">
              {totpError}
            </p>
          ) : (
            <p id="login-totp-hint" className="text-sm text-muted-foreground">
              {TOTP_HINT}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang đăng nhập…" : "Đăng nhập"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
        )}
      </div>
    </form>
  );
}
