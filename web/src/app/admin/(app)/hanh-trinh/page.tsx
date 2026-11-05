"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { TimelineEventForm } from "@/components/admin/timeline/TimelineEventForm";
import { TimelineList } from "@/components/admin/timeline/TimelineList";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { useAdminSession } from "@/lib/admin/session";
import { sortedByYear, yearOrderBreak } from "@/lib/admin/timeline-order";
import type { TimelineEventAdminDto } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";

/** The id in a dashboard link (`?sua=<id>`), or `null`. */
function linkedId(): number | null {
  const value = Number(new URLSearchParams(window.location.search).get("sua"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * The events in year order, saved with PUT /admin/timeline/order. Same-year events keep their order. If the save
 * fails the events stay as loaded: the list then shows the warning and its "Xếp theo năm" button.
 */
async function inYearOrder(
  events: TimelineEventAdminDto[],
  requireReLogin: () => Promise<void>,
): Promise<TimelineEventAdminDto[]> {
  if (yearOrderBreak(events) === null) return events;
  const sorted = sortedByYear(events);
  try {
    await withReLogin(
      () =>
        adminFetch<void>("/admin/timeline/order", {
          method: "PUT",
          body: { ids: sorted.map((item) => item.id) },
        }),
      requireReLogin,
    );
    toast.success("Đã xếp mốc theo năm.");
    return sorted;
  } catch {
    return events;
  }
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
  // True after a save: the next load puts the events in year order, so a new 1980 does not stay after 1990.
  const sortAfterSave = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks the reload as started
    setReloading(true);
    const sortNow = sortAfterSave.current;
    sortAfterSave.current = false;
    withReLogin(() => adminFetch<TimelineEventAdminDto[]>("/admin/timeline"), requireReLogin)
      .then((value) => (sortNow ? inYearOrder(value, requireReLogin) : value))
      .then(
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
      {events !== null && events.length > 0 ? (
        <TimelineList events={events} refreshing={reloading || error !== null} onSelect={setEditing} />
      ) : null}
      {editing !== null ? (
        <TimelineEventForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            sortAfterSave.current = true;
            setEditing(null);
            setAttempt((n) => n + 1);
          }}
        />
      ) : null}
    </div>
  );
}
