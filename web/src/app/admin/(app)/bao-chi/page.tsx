"use client";

import { useEffect, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { PressForm } from "@/components/admin/press/PressForm";
import { PressList } from "@/components/admin/press/PressList";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import type { PressMentionAdminDto } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";

/** What the dialog shows: nothing, a new mention, or one mention to edit. */
type Editing = null | "new" | PressMentionAdminDto;

/** The press page: mentions in order, with reordering, and a dialog to add or edit one. */
export default function PressPage() {
  const { requireReLogin } = useAdminSession();
  const [items, setItems] = useState<PressMentionAdminDto[] | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  // Set when a swap was half written: the list is loaded again and this says why the order may look odd.
  const [reorderFailure, setReorderFailure] = useState<AdminApiError | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [attempt, setAttempt] = useState(0);
  // True while a GET runs: the list on screen may be out of date.
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the reload as started
    setReloading(true);
    withReLogin(() => adminFetch<PressMentionAdminDto[]>("/admin/press"), requireReLogin).then(
      (value) => {
        if (cancelled) return;
        setItems(value);
        setReloading(false);
      },
      (failure: unknown) => {
        if (cancelled) return;
        setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
        setReloading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, requireReLogin]);

  function onPartialFailure(failure: AdminApiError | null) {
    setReorderFailure(failure);
    if (failure !== null) setAttempt((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button type="button" onClick={() => setEditing("new")}>
        Thêm bài báo
      </Button>
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
      {reorderFailure !== null ? (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <p>{reorderFailure.detail}</p>
          <p>Thứ tự có thể mới đổi một phần. Danh sách đã được tải lại từ máy chủ.</p>
        </div>
      ) : null}
      {items === null && error === null ? (
        <p role="status" className="text-center text-muted-foreground">
          Đang tải…
        </p>
      ) : null}
      {items !== null && items.length === 0 ? <p className="py-6 text-center text-muted-foreground">Chưa có bài báo nào.</p> : null}
      {items !== null && items.length > 0 ? (
        <PressList items={items} refreshing={reloading || error !== null} onSelect={setEditing} onPartialFailure={onPartialFailure} />
      ) : null}
      {editing !== null ? (
        <PressForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            setReorderFailure(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : null}
    </div>
  );
}
