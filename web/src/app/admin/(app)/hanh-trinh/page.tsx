"use client";

import { useEffect, useRef, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { TimelineEventForm } from "@/components/admin/timeline/TimelineEventForm";
import { TimelineList } from "@/components/admin/timeline/TimelineList";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import type { TimelineEventAdminDto } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";

/** The id in a dashboard link (`?sua=<id>`), or `null`. */
function linkedId(): number | null {
  const value = Number(new URLSearchParams(window.location.search).get("sua"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** What the dialog shows: nothing, a new event, or one event to edit. */
type Editing = null | "new" | TimelineEventAdminDto;

/** The timeline: events in order, with reordering, and a dialog to add or edit one. */
export default function TimelinePage() {
  const { requireReLogin } = useAdminSession();
  const [events, setEvents] = useState<TimelineEventAdminDto[] | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [attempt, setAttempt] = useState(0);
  // A dashboard link opens one item, on the first load only.
  const linkHandled = useRef(false);
  const [linkGone, setLinkGone] = useState(false);
  // True while a GET runs: the list on screen may be out of date.
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the reload as started
    setReloading(true);
    withReLogin(() => adminFetch<TimelineEventAdminDto[]>("/admin/timeline"), requireReLogin).then(
      (value) => {
        if (cancelled) return;
        setEvents(value);
        if (!linkHandled.current) {
          linkHandled.current = true;
          const id = linkedId();
          const linked = value.find((item) => item.id === id);
          if (linked !== undefined) setEditing(linked);
          else if (id !== null) setLinkGone(true);
        }
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

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button type="button" onClick={() => setEditing("new")}>
        Thêm mốc
      </Button>
      {linkGone ? (
        <p role="status" className="rounded-md border bg-card p-3 text-sm">
          Không tìm thấy mục cần sửa. Có thể mục đó đã bị xóa.
        </p>
      ) : null}
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
      {events === null && error === null ? (
        <p role="status" className="text-center text-muted-foreground">
          Đang tải…
        </p>
      ) : null}
      {events !== null && events.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Chưa có mốc nào.</p>
      ) : null}
      {events !== null && events.length > 0 ? <TimelineList events={events} refreshing={reloading || error !== null} onSelect={setEditing} /> : null}
      {editing !== null ? (
        <TimelineEventForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : null}
    </div>
  );
}
