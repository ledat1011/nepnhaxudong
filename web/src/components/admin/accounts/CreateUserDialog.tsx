"use client";

import { useId, useState } from "react";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, isSessionExpired } from "@/lib/admin/errors";
import { TEMP_PASSWORD_MIN_LENGTH, generateTempPassword } from "@/lib/admin/temp-password";
import type { CreateUserRequest, UserSummary } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { PasswordReveal } from "./PasswordReveal";

type Props = {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Called after the account was created, so the list can load again. */
  onCreated(): void;
};

/**
 * Creates a family account with a temporary password. The form is mounted only while `open`, so closing
 * the dialog throws away everything typed and the password that was shown.
 */
export function CreateUserDialog({ open, onOpenChange, onCreated }: Props) {
  return open ? <CreateUserForm onOpenChange={onOpenChange} onCreated={onCreated} /> : null;
}

function CreateUserForm({ onOpenChange, onCreated }: Omit<Props, "open">) {
  const emailId = useId();
  const nameId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  // The password the server accepted. It is shown once and lives only in this component.
  const [shown, setShown] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const saving = useSave(
    async () => {
      const body: CreateUserRequest = {
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        temporaryPassword: password,
      };
      try {
        await adminFetch<UserSummary>("/admin/users", { method: "POST", body });
      } catch (failure) {
        // Unless the API said the request was wrong, the account may exist now (a lost answer): show the list as it is.
        if (failure instanceof AdminApiError && failure.status !== 400 && !isSessionExpired(failure)) onCreated();
        throw failure;
      }
      // The caller shows this value, so it is exactly the password of the request the server accepted.
      return body.temporaryPassword;
    },
    { successMessage: "Đã tạo tài khoản." },
  );

  const done = shown !== null;
  const dirty = !done && (email !== "" || displayName !== "" || password !== "");
  const canCreate =
    !saving.pending && email.trim() !== "" && displayName.trim() !== "" && password.length >= TEMP_PASSWORD_MIN_LENGTH;

  async function create() {
    const accepted = await saving.save();
    if (accepted === undefined) return;
    setShown(accepted);
    setPassword("");
    onCreated();
  }

  function requestClose() {
    if (saving.pending) return;
    if (dirty) setConfirmDiscard(true);
    else onOpenChange(false);
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : requestClose())}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm người nhà</DialogTitle>
            <DialogDescription>
              {done
                ? "Tài khoản đã được tạo."
                : "Tạo tài khoản với mật khẩu tạm thời. Người đó phải đổi mật khẩu khi đăng nhập lần đầu."}
            </DialogDescription>
          </DialogHeader>
          {shown !== null ? (
            <div className="flex flex-col gap-4">
              <PasswordReveal password={shown} />
              <Button type="button" onClick={() => onOpenChange(false)}>
                Xong
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={emailId}>Email</Label>
                <Input
                  id={emailId}
                  type="email"
                  autoComplete="off"
                  value={email}
                  disabled={saving.pending}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={nameId}>Tên hiển thị</Label>
                <Input
                  id={nameId}
                  autoComplete="off"
                  value={displayName}
                  disabled={saving.pending}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={passwordId}>Mật khẩu tạm thời (ít nhất {TEMP_PASSWORD_MIN_LENGTH} ký tự)</Label>
                <Input
                  id={passwordId}
                  type="password"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  value={password}
                  disabled={saving.pending}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving.pending}
                  onClick={() => setPassword(generateTempPassword())}
                >
                  Tạo mật khẩu
                </Button>
                <p className="text-sm text-muted-foreground">Mật khẩu hiện ra một lần sau khi tạo tài khoản.</p>
              </div>
              <ProblemMessage error={saving.error} />
              {saving.error?.status === 409 ? (
                <p className="text-sm text-muted-foreground">
                  Tài khoản này có thể đã có rồi. Hãy xem danh sách; dùng &quot;Đặt lại mật khẩu&quot; để đặt mật khẩu tạm thời mới.
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button type="button" onClick={() => void create()} disabled={!canCreate}>
                  {saving.pending ? "Đang tạo…" : "Tạo tài khoản"}
                </Button>
                <Button type="button" variant="outline" onClick={requestClose} disabled={saving.pending}>
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Bỏ thay đổi chưa lưu?"
        description="Những gì bạn vừa nhập sẽ mất."
        confirmLabel="Bỏ thay đổi"
        destructive
        onConfirm={() => onOpenChange(false)}
      />
    </>
  );
}
