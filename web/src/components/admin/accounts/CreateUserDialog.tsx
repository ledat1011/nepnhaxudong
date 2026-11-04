"use client";

import { useId, useState } from "react";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { FieldError, NotSavedNotice, RequiredMark, RequiredNote } from "@/components/admin/form/FieldError";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, isSessionExpired } from "@/lib/admin/errors";
import { fieldOfDetail, invalidProps, type FieldErrors, type FieldRule } from "@/lib/admin/field-errors";
import { TEMP_PASSWORD_MIN_LENGTH, generateTempPassword } from "@/lib/admin/temp-password";
import type { CreateUserRequest, UserSummary } from "@/lib/admin/types";
import { useFieldErrors } from "@/lib/admin/use-field-errors";
import { useSave } from "@/lib/admin/use-save";
import { PasswordReveal } from "./PasswordReveal";

/** The API messages that name a field of this form (see `CreateUserRequest` and `UserAdminService`). */
const FIELD_RULES: FieldRule[] = [
  { prefix: "Email", field: "email" },
  { prefix: "Tên hiển thị", field: "displayName" },
  { prefix: "Mật khẩu tạm thời", field: "password" },
];

/** The same checks as the API, with the same texts, so nothing is sent that it would refuse. */
function check(email: string, displayName: string, password: string): FieldErrors {
  const errors: Record<string, string> = {};
  if (email.trim() === "") errors.email = "Email không được để trống.";
  if (displayName.trim() === "") errors.displayName = "Tên hiển thị không được để trống.";
  if (password === "") errors.password = "Mật khẩu tạm thời không được để trống.";
  else if (password.length < TEMP_PASSWORD_MIN_LENGTH) {
    errors.password = `Mật khẩu tạm thời phải có ít nhất ${TEMP_PASSWORD_MIN_LENGTH} ký tự.`;
  }
  return errors;
}

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
  const fields = useFieldErrors();

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
    {
      successMessage: "Đã tạo tài khoản.",
      onError: (error) => {
        const field = fieldOfDetail(error.detail, FIELD_RULES);
        if (field !== null) fields.show({ [field]: error.detail });
      },
    },
  );

  const done = shown !== null;
  const dirty = !done && (email !== "" || displayName !== "" || password !== "");
  // On even with empty boxes: pressing it shows what is missing.
  const canCreate = !saving.pending;
  const saveError = saving.error !== null && fieldOfDetail(saving.error.detail, FIELD_RULES) === null ? saving.error : null;

  async function create() {
    const problems = check(email, displayName, password);
    if (Object.keys(problems).length > 0) {
      saving.reset();
      fields.show(problems);
      return;
    }
    fields.reset();
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
            <div {...fields.rootProps} className="flex flex-col gap-4">
              <RequiredNote />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={emailId}>
                  Email
                  <RequiredMark />
                </Label>
                <Input
                  id={emailId}
                  type="email"
                  autoComplete="off"
                  required
                  value={email}
                  disabled={saving.pending}
                  {...invalidProps(emailId, fields.errors.email)}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    fields.clear("email");
                  }}
                />
                <FieldError id={emailId} message={fields.errors.email} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={nameId}>
                  Tên hiển thị
                  <RequiredMark />
                </Label>
                <Input
                  id={nameId}
                  autoComplete="off"
                  required
                  value={displayName}
                  disabled={saving.pending}
                  {...invalidProps(nameId, fields.errors.displayName)}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    fields.clear("displayName");
                  }}
                />
                <FieldError id={nameId} message={fields.errors.displayName} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={passwordId}>
                  Mật khẩu tạm thời (ít nhất {TEMP_PASSWORD_MIN_LENGTH} ký tự)
                  <RequiredMark />
                </Label>
                <Input
                  id={passwordId}
                  type="password"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  required
                  value={password}
                  disabled={saving.pending}
                  {...invalidProps(passwordId, fields.errors.password)}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    fields.clear("password");
                  }}
                />
                <FieldError id={passwordId} message={fields.errors.password} />
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving.pending}
                  onClick={() => {
                    setPassword(generateTempPassword());
                    fields.clear("password");
                  }}
                >
                  Tạo mật khẩu
                </Button>
                <p className="text-sm text-muted-foreground">Mật khẩu hiện ra một lần sau khi tạo tài khoản.</p>
              </div>
              <ProblemMessage error={saveError} />
              <NotSavedNotice show={fields.hasErrors} />
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
