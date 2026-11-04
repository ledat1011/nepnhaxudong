"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import type { UserSummary } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";
import { CreateUserDialog } from "./CreateUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

type Toggle = { user: UserSummary; action: "disable" | "enable" };

type Props = {
  users: UserSummary[];
  /** Called after any change, so the list can load again. */
  onChanged(): void;
};

/** The family accounts, with the actions on each one. */
export function UserList({ users, onChanged }: Props) {
  const { requireReLogin, user: me } = useAdminSession();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<UserSummary | null>(null);
  const [toggle, setToggle] = useState<Toggle | null>(null);
  // The last question stays for the labels of the dialog while it closes, so the words do not change meanwhile.
  const [lastToggle, setLastToggle] = useState<Toggle | null>(null);
  const shown = toggle ?? lastToggle;
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const running = useRef(false);

  async function run({ user, action }: Toggle) {
    // One change at a time: a second tap while the first runs must not send another request.
    if (running.current) return;
    running.current = true;
    setBusyId(user.id);
    setError(null);
    try {
      await withReLogin(() => adminFetch<void>(`/admin/users/${user.id}/${action}`, { method: "POST" }), requireReLogin);
      toast.success(action === "disable" ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.");
      onChanged();
    } catch (failure) {
      setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
    } finally {
      running.current = false;
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Danh sách tài khoản">
      <Button type="button" onClick={() => setCreating(true)}>
        Thêm người nhà
      </Button>
      <ProblemMessage error={error} />
      <ul className="flex flex-col gap-2">
        {users.map((user) => {
          const isMe = me !== null && me.id === user.id;
          // While any change runs, no row offers another one: a second confirmation would be dropped.
          const busy = busyId !== null;
          return (
            <li key={user.id} aria-label={user.displayName} className="flex flex-col gap-3 rounded-md border bg-card p-3">
              <div className="flex flex-col gap-1">
                <span className="break-words font-semibold">
                  {user.displayName}
                  {isMe ? " (bạn)" : ""}
                </span>
                <span className="break-all text-sm text-muted-foreground">{user.email}</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant={user.enabled ? "secondary" : "destructive"}>
                    {user.enabled ? "Đang dùng" : "Đã khóa"}
                  </Badge>
                  {user.totpEnabled ? <Badge variant="outline">Có 2 lớp</Badge> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.enabled ? (
                  // The API refuses to lock your own account, so the button is not offered.
                  isMe ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Khóa ${user.displayName}`}
                      disabled={busy}
                      onClick={() => { const next: Toggle = { user, action: "disable" }; setToggle(next); setLastToggle(next); }}
                    >
                      Khóa
                    </Button>
                  )
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Mở khóa ${user.displayName}`}
                    disabled={busy}
                    onClick={() => { const next: Toggle = { user, action: "enable" }; setToggle(next); setLastToggle(next); }}
                  >
                    Mở khóa
                  </Button>
                )}
                {isMe ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Đặt lại mật khẩu của ${user.displayName}`}
                    disabled={busy}
                    onClick={() => setResetting(user)}
                  >
                    Đặt lại mật khẩu
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <CreateUserDialog open={creating} onOpenChange={setCreating} onCreated={onChanged} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} onDone={onChanged} />
      <ConfirmDialog
        open={toggle !== null}
        onOpenChange={(open) => (open ? undefined : setToggle(null))}
        title={shown?.action === "enable" ? "Mở khóa tài khoản này?" : "Khóa tài khoản này?"}
        description={
          shown?.action === "enable"
            ? `${shown.user.displayName} sẽ đăng nhập lại được.`
            : `${shown?.user.displayName ?? ""} sẽ bị đăng xuất và không đăng nhập được nữa cho đến khi bạn mở khóa.`
        }
        confirmLabel={shown?.action === "enable" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
        destructive={shown?.action !== "enable"}
        onConfirm={() => {
          if (toggle !== null) void run(toggle);
        }}
      />
    </section>
  );
}
