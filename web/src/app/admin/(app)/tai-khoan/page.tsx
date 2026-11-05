"use client";

import { useEffect, useState } from "react";
import { TwoFactorCard } from "@/components/admin/accounts/TwoFactorCard";
import { UserList } from "@/components/admin/accounts/UserList";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import type { UserSummary } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";

/**
 * An owner ("Chủ") sees the family accounts and the own two-factor card. A member ("Người nhà") sees only
 * the own two-factor card: the API refuses them the account list (403).
 */
export default function AccountsPage() {
  const { user: me } = useAdminSession();
  return me?.role === "OWNER" ? <OwnerAccounts /> : <MemberSecurity />;
}

function MemberSecurity() {
  const { user: me, refresh } = useAdminSession();
  const enabled = me?.totpEnabled ?? false;
  return (
    <div className="flex flex-col gap-6 p-4">
      {/* A new key when the session changes: the card starts again and keeps no secret from before. */}
      <TwoFactorCard
        key={String(enabled)}
        enabled={enabled}
        canSwitchOff={!(me?.totpRequired ?? false)}
        onChanged={() => void refresh()}
      />
      <p className="text-sm text-muted-foreground">
        Tài khoản của cả nhà do Chủ quản lý. Khi cần mở khóa, đặt lại mật khẩu hay tắt xác thực 2 lớp vì mất
        điện thoại, hãy nhờ Chủ.
      </p>
    </div>
  );
}

function OwnerAccounts() {
  const { requireReLogin, user: me } = useAdminSession();
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // A later load replaces an earlier one: the cleanup makes an old answer that arrives late do nothing.
    let cancelled = false;
    withReLogin(() => adminFetch<UserSummary[]>("/admin/users"), requireReLogin).then(
      (loaded) => {
        if (cancelled) return;
        setUsers(loaded);
        setError(null);
      },
      (failure: unknown) => {
        if (!cancelled) setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, requireReLogin]);

  const reload = () => setAttempt((n) => n + 1);
  const self = users?.find((account) => me !== null && account.id === me.id);

  return (
    <div className="flex flex-col gap-6 p-4">
      <ProblemMessage error={error} />
      {error !== null && users === null ? (
        <Button type="button" variant="outline" onClick={reload}>
          Thử lại
        </Button>
      ) : null}
      {users === null && error === null ? (
        <p role="status" className="text-center text-muted-foreground">
          Đang tải…
        </p>
      ) : null}
      {self !== undefined ? (
        // A new key when the loaded state changes: the card starts again and keeps no secret from before.
        <TwoFactorCard
          key={String(self.totpEnabled)}
          enabled={self.totpEnabled}
          canSwitchOff={!self.totpRequired}
          onChanged={reload}
        />
      ) : null}
      {users !== null ? <UserList users={users} onChanged={reload} /> : null}
    </div>
  );
}
