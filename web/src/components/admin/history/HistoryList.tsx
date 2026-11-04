"use client";

import { useEffect, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { actionLabel, entityTypeLabel, formatVnTime } from "@/lib/admin/audit-diff";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import type { AuditEntryDto } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";
import { HistoryDetail } from "./HistoryDetail";

/** The API sends 50 lines a page: a shorter page is the last one. */
const PAGE_SIZE = 50;
const ALL_TYPES = "";
const TYPES = ["product", "timeline_event", "press_mention", "story", "media", "site_setting", "app_user"];

function listPath(entityType: string, page: number): string {
  const type = entityType === ALL_TYPES ? "" : `entityType=${encodeURIComponent(entityType)}&`;
  return `/admin/audit?${type}page=${page}`;
}

/** The edit history, newest first, with a filter by kind of content and paging. Tap a line to see it and restore it. */
export function HistoryList() {
  const { requireReLogin } = useAdminSession();
  const [entityType, setEntityType] = useState(ALL_TYPES);
  const [page, setPage] = useState(0);
  const [entries, setEntries] = useState<AuditEntryDto[] | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // The answer of an earlier filter, page or attempt may arrive late: it must not replace the current one.
    withReLogin(() => adminFetch<AuditEntryDto[]>(listPath(entityType, page)), requireReLogin).then(
      (value) => {
        if (cancelled) return;
        setEntries(value);
        setError(null);
      },
      (failure: unknown) => {
        if (!cancelled) setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [entityType, page, attempt, requireReLogin]);

  function changeFilter(value: string) {
    setEntityType(value);
    setPage(0);
    setEntries(null);
    setError(null);
  }

  function changePage(next: number) {
    setPage(next);
    setEntries(null);
    setError(null);
  }

  const hasNext = entries !== null && entries.length >= PAGE_SIZE;

  return (
    <>
      {openId !== null ? (
        <HistoryDetail
          key={openId}
          id={openId}
          onRestored={() => setAttempt((n) => n + 1)}
          onClose={() => setOpenId(null)}
        />
      ) : null}
      <div hidden={openId !== null} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Loại nội dung
          <select
            value={entityType}
            onChange={(event) => changeFilter(event.target.value)}
            className="h-11 rounded-md border bg-background px-3 text-base font-normal"
          >
            <option value={ALL_TYPES}>Tất cả</option>
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {entityTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
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
          <p role="status" className="text-center text-muted-foreground">
            Đang tải…
          </p>
        ) : null}
        {entries !== null && entries.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">{page === 0 ? "Chưa có thay đổi nào." : "Hết danh sách."}</p>
        ) : null}
        {entries !== null && entries.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(entry.id)}
                  className="flex min-h-11 w-full min-w-0 flex-col items-start gap-0.5 rounded-md border bg-card p-3 text-left"
                >
                  <span className="min-w-0 break-words font-semibold">{entry.label}</span>{" "}
                  <span className="min-w-0 break-words text-sm text-muted-foreground">
                    {formatVnTime(entry.createdAt)} · {entry.userDisplayName} · {entityTypeLabel(entry.entityType)} ·{" "}
                    {actionLabel(entry.action)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" disabled={page === 0} onClick={() => changePage(page - 1)}>
            Trang trước
          </Button>
          <span className="text-sm text-muted-foreground">Trang {page + 1}</span>
          <Button type="button" variant="outline" disabled={!hasNext} onClick={() => changePage(page + 1)}>
            Trang sau
          </Button>
        </div>
      </div>
    </>
  );
}
