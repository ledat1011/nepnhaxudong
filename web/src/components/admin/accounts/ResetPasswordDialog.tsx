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

type Props = {
  /** The account to reset. `null` keeps the dialog closed. */
  user: UserSummary | null;
  onClose(): void;
  /** Called after the reset succeeded, so the list can load again. */
  onDone(): void;
};

/**
 * Sets a new temporary password for another family member. The dialog is mounted only while `user` is set,
 * so closing it throws away the generated password.
 */
export function ResetPasswordDialog({ user, onClose, onDone }: Props) {
  return user === null ? null : <ResetPasswordForm key={user.id} user={user} onClose={onClose} onDone={onDone} />;
}

function ResetPasswordForm({ user, onClose, onDone }: Omit<Props, "user"> & { user: UserSummary }) {
  // Made when the dialog opens. It is shown only after the server accepted it.
  const [password] = useState(generateTempPassword);
  const [shown, setShown] = useState<string | null>(null);

  const saving = useSave(
    async () => {
      const body: ResetPasswordRequest = { temporaryPassword: password };
      await adminFetch<void>(`/admin/users/${user.id}/reset-password`, { method: "POST", body });
      return body.temporaryPassword;
    },
    { successMessage: "Đã đặt lại mật khẩu." },
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
          <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          <DialogDescription>
            {user.displayName} ({user.email})
          </DialogDescription>
        </DialogHeader>
        {shown !== null ? (
          <div className="flex flex-col gap-4">
            <PasswordReveal password={shown} />
            <Button type="button" onClick={onClose}>
              Xong
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Thao tác này cũng tắt xác thực 2 lớp của người này.
            </p>
            <p className="text-sm text-muted-foreground">
              Một mật khẩu tạm thời mới sẽ hiện ra một lần. Người này phải đổi mật khẩu ở lần đăng nhập tiếp theo.
            </p>
            <ProblemMessage error={saving.error} />
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => void reset()} disabled={saving.pending}>
                {saving.pending ? "Đang đặt lại…" : "Đặt lại mật khẩu"}
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
