"use client";

import { useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { adminFetch } from "@/lib/admin/api";
import { generateTempPassword } from "@/lib/admin/temp-password";
import type { ResetPasswordRequest, UserSummary } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { PasswordReveal } from "./PasswordReveal";

/**
 * `reset`: a new temporary password. `turn-off-totp`: for a lost phone, two-factor login is switched off
 * and a new temporary password is set in the same step, so whoever has the phone and its saved password
 * cannot get in. The person changes the password, then sets up two-factor login again.
 */
export type ResetMode = "reset" | "turn-off-totp";

type Texts = { title: string; path: string; confirm: string; pending: string; done: string };

const TEXTS: Record<ResetMode, Texts> = {
  reset: {
    title: "Đặt lại mật khẩu",
    path: "reset-password",
    confirm: "Đặt lại mật khẩu",
    pending: "Đang đặt lại…",
    done: "Đã đặt lại mật khẩu.",
  },
  "turn-off-totp": {
    title: "Tắt xác thực 2 lớp",
    path: "disable-totp",
    confirm: "Tắt 2 lớp và đặt mật khẩu tạm",
    pending: "Đang xử lý…",
    done: "Đã tắt xác thực 2 lớp và đặt mật khẩu tạm.",
  },
};

type Props = {
  /** The account to reset. `null` keeps the dialog closed. */
  user: UserSummary | null;
  mode?: ResetMode;
  onClose(): void;
  /** Called after the reset succeeded, so the list can load again. */
  onDone(): void;
};

/**
 * Sets a new temporary password for another family member. The dialog is mounted only while `user` is set,
 * so closing it throws away the generated password.
 */
export function ResetPasswordDialog({ user, mode = "reset", onClose, onDone }: Props) {
  return user === null ? null : (
    <ResetPasswordForm key={user.id} user={user} mode={mode} onClose={onClose} onDone={onDone} />
  );
}

function ResetPasswordForm({
  user,
  mode,
  onClose,
  onDone,
}: Omit<Props, "user" | "mode"> & { user: UserSummary; mode: ResetMode }) {
  const texts = TEXTS[mode];
  // Made when the dialog opens. It is shown only after the server accepted it.
  const [password] = useState(generateTempPassword);
  const [shown, setShown] = useState<string | null>(null);

  const saving = useSave(
    async () => {
      const body: ResetPasswordRequest = { temporaryPassword: password };
      await adminFetch<void>(`/admin/users/${user.id}/${texts.path}`, { method: "POST", body });
      return body.temporaryPassword;
    },
    { successMessage: texts.done },
  );

  async function reset() {
    const accepted = await saving.save();
    if (accepted === undefined) return;
    setShown(accepted);
    onDone();
  }

  return (
    <Dialog open onOpenChange={(open) => (open || saving.pending ? undefined : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{texts.title}</DialogTitle>
          <DialogDescription>
            {user.displayName} ({user.email})
          </DialogDescription>
        </DialogHeader>
        {shown !== null ? (
          <div className="flex flex-col gap-4">
            <PasswordReveal password={shown} email={user.email} />
            <Button type="button" onClick={onClose}>
              Xong
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {mode === "turn-off-totp" ? (
              <div className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <p>
                  Dùng khi {user.displayName} mất hoặc đổi điện thoại. Thao tác này làm 2 việc cùng lúc: tắt xác thực 2
                  lớp và đặt một mật khẩu tạm thời mới.
                </p>
                <p>
                  {user.displayName} sẽ bị đăng xuất. Lần đăng nhập tới dùng mật khẩu tạm, đổi mật khẩu, rồi bật lại xác
                  thực 2 lớp.
                </p>
              </div>
            ) : user.totpEnabled ? (
              // The API also asks this person to set up two-factor login again (as "Tắt 2 lớp" does).
              <div className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <p>Thao tác này cũng tắt xác thực 2 lớp của người này.</p>
                <p>Sau khi đổi mật khẩu, người này phải bật lại xác thực 2 lớp.</p>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Một mật khẩu tạm thời mới sẽ hiện ra một lần. Người này phải đổi mật khẩu ở lần đăng nhập tiếp theo.
            </p>
            <ProblemMessage error={saving.error} />
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => void reset()} disabled={saving.pending}>
                {saving.pending ? texts.pending : texts.confirm}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={saving.pending}>
                Hủy
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
