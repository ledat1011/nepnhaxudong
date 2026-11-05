"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { ROLE_LABELS } from "@/lib/admin/roles";
import { useAdminSession } from "@/lib/admin/session";
import type { UserSummary } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";
import { CreateUserDialog } from "./CreateUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

type ActionKind = "disable" | "enable" | "promote" | "demote" | "disable-totp";

type Action = { user: UserSummary; kind: ActionKind; isMe: boolean };

type Question = { title: string; description: string; confirmLabel: string; destructive: boolean };

/** The request of each action. All are POST; only a role change has a body. */
const REQUESTS: Record<ActionKind, { path: string; body?: unknown }> = {
  disable: { path: "disable" },
  enable: { path: "enable" },
  promote: { path: "role", body: { role: "OWNER" } },
  demote: { path: "role", body: { role: "MEMBER" } },
  "disable-totp": { path: "disable-totp" },
};

const DONE_MESSAGES: Record<ActionKind, string> = {
  disable: "Đã khóa tài khoản.",
  enable: "Đã mở khóa tài khoản.",
  promote: "Đã cho làm Chủ.",
  demote: "Đã thôi làm Chủ.",
  "disable-totp": "Đã tắt xác thực 2 lớp.",
};

function question({ user, kind, isMe }: Action): Question {
  const name = user.displayName;
  switch (kind) {
    case "enable":
      return {
        title: "Mở khóa tài khoản này?",
        description: `${name} sẽ đăng nhập lại được.`,
        confirmLabel: "Mở khóa tài khoản",
        destructive: false,
      };
    case "disable":
      return {
        title: "Khóa tài khoản này?",
        description: `${name} sẽ bị đăng xuất và không đăng nhập được nữa cho đến khi bạn mở khóa.`,
        confirmLabel: "Khóa tài khoản",
        destructive: true,
      };
    case "promote":
      return {
        title: `Cho ${name} làm Chủ?`,
        description: `${name} sẽ quản lý được tài khoản của cả nhà: thêm người, khóa, đặt lại mật khẩu, tắt xác thực 2 lớp.`,
        confirmLabel: "Cho làm Chủ",
        destructive: false,
      };
    case "demote":
      return {
        title: isMe ? "Thôi làm Chủ?" : `Thôi cho ${name} làm Chủ?`,
        description: isMe
          ? "Bạn sẽ thành Người nhà: vẫn sửa được nội dung, nhưng không quản lý tài khoản được nữa."
          : `${name} sẽ thành Người nhà: vẫn sửa được nội dung, nhưng không quản lý tài khoản. ${name} sẽ bị đăng xuất.`,
        confirmLabel: "Thôi làm Chủ",
        destructive: true,
      };
    case "disable-totp":
      return {
        title: `Tắt xác thực 2 lớp của ${name}?`,
        description: `Dùng khi ${name} mất hoặc đổi điện thoại. ${name} sẽ bị đăng xuất, và lần đăng nhập tới phải bật lại xác thực 2 lớp.`,
        confirmLabel: "Tắt xác thực 2 lớp",
        destructive: true,
      };
  }
}

type Props = {
  users: UserSummary[];
  /** Called after any change, so the list can load again. */
  onChanged(): void;
};

/** The family accounts, with the actions on each one. Only an owner ("Chủ") sees this list. */
export function UserList({ users, onChanged }: Props) {
  const { requireReLogin, refresh, user: me } = useAdminSession();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<UserSummary | null>(null);
  const [asked, setAsked] = useState<Action | null>(null);
  // The last question stays for the labels of the dialog while it closes, so the words do not change meanwhile.
  const [lastAsked, setLastAsked] = useState<Action | null>(null);
  const shown = asked ?? lastAsked;
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const running = useRef(false);
  // The family keeps at least one active owner: the API refuses to take the last one away, so it is not offered.
  const activeOwners = users.filter((account) => account.role === "OWNER" && account.enabled).length;

  function ask(user: UserSummary, kind: ActionKind, isMe: boolean) {
    const next: Action = { user, kind, isMe };
    setAsked(next);
    setLastAsked(next);
  }

  async function run({ user, kind, isMe }: Action) {
    // One change at a time: a second tap while the first runs must not send another request.
    if (running.current) return;
    running.current = true;
    setBusyId(user.id);
    setError(null);
    const { path, body } = REQUESTS[kind];
    try {
      await withReLogin(
        () => adminFetch<void>(`/admin/users/${user.id}/${path}`, body === undefined ? { method: "POST" } : { method: "POST", body }),
        requireReLogin,
      );
      toast.success(DONE_MESSAGES[kind]);
      // Owners who stepped back are members now: the session tells the menu and this page.
      if (kind === "demote" && isMe) await refresh();
      onChanged();
    } catch (failure) {
      setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
    } finally {
      running.current = false;
      setBusyId(null);
    }
  }

  const words = shown === null ? null : question(shown);

  return (
    <section className="flex flex-col gap-3" aria-label="Danh sách tài khoản">
      <Button type="button" onClick={() => setCreating(true)}>
        Thêm người nhà
      </Button>
      <ProblemMessage error={error} />
      <ul className="flex flex-col gap-2">
        {users.map((user) => {
          const isMe = me !== null && me.id === user.id;
          const isOwner = user.role === "OWNER";
          const lastOwner = isOwner && user.enabled && activeOwners <= 1;
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
                  <Badge variant={isOwner ? "default" : "outline"}>{ROLE_LABELS[user.role]}</Badge>
                  <Badge variant={user.enabled ? "secondary" : "destructive"}>
                    {user.enabled ? "Đang dùng" : "Đã khóa"}
                  </Badge>
                  {user.totpEnabled ? <Badge variant="outline">Có 2 lớp</Badge> : null}
                  {user.mustSetupTotp ? <Badge variant="outline">Cần bật lại 2 lớp</Badge> : null}
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
                      onClick={() => ask(user, "disable", isMe)}
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
                    onClick={() => ask(user, "enable", isMe)}
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
                {!isOwner ? (
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Cho ${user.displayName} làm Chủ`}
                    disabled={busy}
                    onClick={() => ask(user, "promote", isMe)}
                  >
                    Cho làm Chủ
                  </Button>
                ) : lastOwner ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Thôi cho ${user.displayName} làm Chủ`}
                    disabled={busy}
                    onClick={() => ask(user, "demote", isMe)}
                  >
                    Thôi làm Chủ
                  </Button>
                )}
                {/* Your own two-factor login is switched off with a code, in the card above. */}
                {user.totpEnabled && !isMe ? (
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Tắt xác thực 2 lớp của ${user.displayName}`}
                    disabled={busy}
                    onClick={() => ask(user, "disable-totp", isMe)}
                  >
                    Tắt 2 lớp
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <CreateUserDialog open={creating} onOpenChange={setCreating} onCreated={onChanged} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} onDone={onChanged} />
      <ConfirmDialog
        open={asked !== null}
        onOpenChange={(open) => (open ? undefined : setAsked(null))}
        title={words?.title ?? ""}
        description={words?.description ?? ""}
        confirmLabel={words?.confirmLabel ?? ""}
        destructive={words?.destructive ?? false}
        onConfirm={() => {
          if (asked !== null) void run(asked);
        }}
      />
    </section>
  );
}
