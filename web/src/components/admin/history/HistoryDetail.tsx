"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { actionLabel, diffSnapshots, entityTypeLabel, formatVnTime } from "@/lib/admin/audit-diff";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import type { AuditDetailDto } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { withReLogin } from "@/lib/admin/with-relogin";

type Props = {
  id: number;
  /** Called after a successful restore, so the list can load again. This component loads its own line again. */
  onRestored(): void;
  onClose(): void;
};

/** One value cell. Text only: a stored value that looks like HTML is shown as typed. */
function Value({ text }: { text: string | null }) {
  if (text === null) return <span className="text-muted-foreground">—</span>;
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

/** The stored copies of one history line side by side, and the button to go back to the earlier copy. */
export function HistoryDetail({ id, onRestored, onClose }: Props) {
  const { requireReLogin } = useAdminSession();
  const [line, setLine] = useState<AuditDetailDto | null>(null);
  const [loadError, setLoadError] = useState<AdminApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirming, setConfirming] = useState(false);
  // True from a successful restore until the line has loaded again: what is on screen is the old copy.
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // A slow answer for an earlier line or an earlier attempt must not replace the current one.
    withReLogin(() => adminFetch<AuditDetailDto>(`/admin/audit/${id}`), requireReLogin).then(
      (value) => {
        if (cancelled) return;
        setLine(value);
        setStale(false);
        setLoadError(null);
      },
      (failure: unknown) => {
        if (!cancelled) setLoadError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, attempt, requireReLogin]);

  const restore = useSave(
    async () => {
      await adminFetch<void>(`/admin/audit/${id}/restore`, { method: "POST" });
      return true;
    },
    { successMessage: "Đã khôi phục." },
  );

  const rows = useMemo(() => (line === null ? [] : diffSnapshots(line.before, line.after)), [line]);

  async function onConfirm() {
    const done = await restore.save();
    if (done === undefined) return;
    setStale(true);
    // Both the open line (it may no longer be restorable) and the list change after a restore.
    setAttempt((n) => n + 1);
    onRestored();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="outline" className="self-start" onClick={onClose}>
        Quay lại danh sách
      </Button>
      <ProblemMessage error={loadError} />
      {loadError !== null ? (
        <Button type="button" variant="outline" className="self-start" onClick={() => setAttempt((n) => n + 1)}>
          Thử lại
        </Button>
      ) : null}
      {(line === null || stale) && loadError === null ? (
        <p role="status" className="text-center text-muted-foreground">
          Đang tải…
        </p>
      ) : null}
      {line !== null && !stale ? (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="break-words text-lg font-bold">{line.label}</h2>
            <p className="break-words text-sm text-muted-foreground">
              {formatVnTime(line.createdAt)} · {line.userDisplayName} · {entityTypeLabel(line.entityType)} · {actionLabel(line.action)}
            </p>
          </div>
          {rows.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">Không có thay đổi nào.</p>
          ) : (
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th scope="col" className="w-1/3 border-b p-2">
                    Trường
                  </th>
                  <th scope="col" className="w-1/3 border-b p-2">
                    Trước
                  </th>
                  <th scope="col" className="w-1/3 border-b p-2">
                    Sau
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.path} className="align-top">
                    <th scope="row" className="break-all border-b p-2 text-left font-medium">
                      {row.path}
                    </th>
                    <td className="border-b p-2">
                      <Value text={row.before} />
                    </td>
                    <td className="border-b p-2">
                      <Value text={row.after} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ProblemMessage error={restore.error} />
          {line.restorable ? (
            <Button type="button" disabled={restore.pending} onClick={() => setConfirming(true)}>
              Khôi phục bản trước
            </Button>
          ) : null}
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Khôi phục bản trước?"
            description="Nội dung hiện tại sẽ được thay bằng bản trước thay đổi này. Việc khôi phục cũng được ghi vào lịch sử."
            confirmLabel="Khôi phục"
            onConfirm={() => void onConfirm()}
          />
        </>
      ) : null}
    </div>
  );
}
