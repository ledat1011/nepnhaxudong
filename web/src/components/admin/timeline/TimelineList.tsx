"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { MissingEnBadge } from "@/components/admin/form/MissingEnBadge";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import type { TimelineEventAdminDto } from "@/lib/admin/types";
import { useMediaByIds } from "@/lib/admin/use-media-by-ids";
import { useSave } from "@/lib/admin/use-save";

/** Finger must stay still this long (ms) before a drag starts, so scrolling the list still works. */
const TOUCH_DRAG_DELAY_MS = 250;
/** How far (px) a finger may move during the delay before the touch counts as a scroll. */
const TOUCH_DRAG_TOLERANCE_PX = 8;

function announcementsFor(shown: TimelineEventAdminDto[]) {
  function where(id: string | number): string {
    const index = shown.findIndex((item) => item.id === id);
    if (index < 0) return "";
    return `${eventName(shown[index])}, vị trí ${index + 1} trên ${shown.length}`;
  }
  return {
    onDragStart: ({ active }: { active: { id: string | number } }) => `Đã nhấc mốc ${where(active.id)}.`,
    onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
      over === null ? undefined : `Mốc ${eventName(shown.find((item) => item.id === active.id) ?? shown[0])} đang ở trên mốc ${where(over.id)}.`,
    onDragEnd: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
      over === null ? `Đã thả mốc ${where(active.id)}.` : `Đã thả mốc ${eventName(shown.find((item) => item.id === active.id) ?? shown[0])} vào vị trí ${shown.findIndex((item) => item.id === over.id) + 1} trên ${shown.length}.`,
    onDragCancel: ({ active }: { active: { id: string | number } }) => `Đã hủy kéo mốc ${where(active.id)}.`,
  };
}

type Props = {
  events: TimelineEventAdminDto[];
  /** True while the parent loads the list again: the shown events may be out of date, so nothing can move. */
  refreshing?: boolean;
  onSelect(event: TimelineEventAdminDto): void;
};

function eventName(event: TimelineEventAdminDto): string {
  return event.title.vi ?? event.title.en ?? `số ${event.id}`;
}

type RowProps = {
  event: TimelineEventAdminDto;
  index: number;
  count: number;
  busy: boolean;
  selectDisabled: boolean;
  onSelect(event: TimelineEventAdminDto): void;
  onMove(index: number, delta: -1 | 1): void;
};

function TimelineRow({ event, index, count, busy, selectDisabled, onSelect, onMove }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
    disabled: busy,
  });
  const name = eventName(event);
  // The first photo is the one the website shows first.
  const firstId = event.mediaIds.slice(0, 1);
  const photo = useMediaByIds(firstId).items[0];
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-2 rounded-md border bg-card p-2 ${isDragging ? "relative z-10 shadow-md" : ""}`}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Kéo mốc ${name}`}
          disabled={busy}
          className="flex size-11 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground disabled:opacity-50"
        >
          <GripVertical aria-hidden />
        </button>
        <button
          type="button"
          disabled={selectDisabled}
          onClick={() => onSelect(event)}
          className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 text-left enabled:hover:bg-muted enabled:active:bg-secondary disabled:opacity-50"
        >
          {photo !== undefined ? (
            // Empty alt: the row is named by its year and title, and the photo is only a reminder of the event.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt=""
              width={photo.width}
              height={photo.height}
              className="size-11 shrink-0 rounded object-cover"
            />
          ) : firstId.length > 0 ? (
            <span className="size-11 shrink-0 rounded bg-muted" aria-hidden />
          ) : null}
          <span className="font-bold">{event.year}</span>
          <span className="min-w-0 flex-1 break-words font-semibold">{name}</span>
          {event.missingEn ? <MissingEnBadge /> : null}
        </button>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Đưa mốc ${name} lên`}
          disabled={busy || index === 0}
          onClick={() => onMove(index, -1)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Đưa mốc ${name} xuống`}
          disabled={busy || index === count - 1}
          onClick={() => onMove(index, 1)}
        >
          <ArrowDown />
        </Button>
      </div>
    </li>
  );
}

/**
 * The events in order. Drag a row, or use the up and down buttons (the path that always works).
 * A move shows at once and is saved with PUT /admin/timeline/order. If that fails the old order comes back.
 * While one move is being saved, every move control is disabled, so a second move cannot start.
 */
export function TimelineList({ events, refreshing = false, onSelect }: Props) {
  // The order the user made. It is dropped when the parent passes a new list (for example after a reload).
  const [seen, setSeen] = useState(events);
  const [ordered, setOrdered] = useState<TimelineEventAdminDto[] | null>(null);
  const latestEvents = useRef(events);
  useLayoutEffect(() => {
    latestEvents.current = events;
  });

  const idsToSend = useRef<number[]>([]);
  const reorder = useSave(
    async () => {
      await adminFetch<void>("/admin/timeline/order", { method: "PUT", body: { ids: idsToSend.current } });
      return true;
    },
    { successMessage: null },
  );

  if (seen !== events) {
    setSeen(events);
    setOrdered(null);
    reorder.reset();
  }
  const shown = ordered ?? events;
  const announcements = useMemo(() => announcementsFor(shown), [shown]);
  const busy = reorder.pending || refreshing;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DRAG_DELAY_MS, tolerance: TOUCH_DRAG_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function apply(next: TimelineEventAdminDto[]) {
    if (busy) return;
    const previous = ordered;
    const loadedFrom = events;
    idsToSend.current = next.map((item) => item.id);
    setOrdered(next);
    const saved = await reorder.save();
    if (saved !== undefined) return;
    if (latestEvents.current === loadedFrom) {
      setOrdered(previous);
    } else {
      // A reload replaced the list while the save ran: the old order and its error mean nothing now.
      reorder.reset();
    }
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= shown.length) return;
    void apply(arrayMove(shown, index, target));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (over === null || active.id === over.id) return;
    const from = shown.findIndex((item) => item.id === active.id);
    const to = shown.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    void apply(arrayMove(shown, from, to));
  }

  return (
    <div className="flex flex-col gap-3">
      <ProblemMessage error={reorder.error} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: "Nhấn phím cách để nhấc mốc, dùng phím mũi tên để di chuyển, nhấn phím cách lần nữa để thả.",
          },
        }}
      >
        <SortableContext items={shown.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {shown.map((event, index) => (
              <TimelineRow
                key={event.id}
                event={event}
                index={index}
                count={shown.length}
                busy={busy}
                selectDisabled={reorder.pending}
                onSelect={onSelect}
                onMove={move}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
