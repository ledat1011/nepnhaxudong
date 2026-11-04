"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { actionLabel, entityTypeLabel, formatVnTime } from "@/lib/admin/audit-diff";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import type { AuditEntryDto } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";

const SHOWN = 10;

/** The newest ten lines of the edit history. */
export function RecentChanges() {
  const { requireReLogin } = useAdminSession();
  const [entries, setEntries] = useState<AuditEntryDto[] | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    withReLogin(() => adminFetch<AuditEntryDto[]>("/admin/audit?page=0"), requireReLogin).then(
      (value) => {
        if (!cancelled) setEntries(value.slice(0, SHOWN));
      },
      (failure: unknown) => {
        if (!cancelled) setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, requireReLogin]);

  return (
    <section aria-labelledby="recent-changes" className="flex flex-col gap-3">
      <h2 id="recent-changes" className="text-lg font-bold">
        Thay đổi gần đây
      </h2>
      <ProblemMessage error={error} />
      {error !== null ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Thử lại
        </Button>
      ) : null}
      {entries === null && error === null ? (
        <p role="status" className="text-muted-foreground">
          Đang tải…
        </p>
      ) : null}
      {entries !== null && entries.length === 0 ? <p className="text-muted-foreground">Chưa có thay đổi nào.</p> : null}
      {entries !== null && entries.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="min-w-0 rounded-md border bg-card p-3">
              <span className="block min-w-0 break-words font-semibold">{entry.label}</span>
              <span className="block min-w-0 break-words text-sm text-muted-foreground">
                {formatVnTime(entry.createdAt)} · {entry.userDisplayName} · {entityTypeLabel(entry.entityType)} ·{" "}
                {actionLabel(entry.action)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button asChild variant="outline">
        <Link href={ADMIN_ROUTES.history}>Xem tất cả</Link>
      </Button>
    </section>
  );
}
