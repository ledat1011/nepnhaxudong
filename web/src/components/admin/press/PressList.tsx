"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { MissingEnBadge } from "@/components/admin/form/MissingEnBadge";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import type { PressMentionAdminDto, PressMentionRequest } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";

type Props = {
  items: PressMentionAdminDto[];
  /** True while the parent loads the list again: the shown mentions may be out of date, so nothing can move. */
  refreshing?: boolean;
  onSelect(item: PressMentionAdminDto): void;
  /**
   * Called with the error when a swap wrote the first mention but not the second, so the server order is half
   * changed and the parent must load the list again. Called with `null` when a new move starts.
   */
  onPartialFailure(error: AdminApiError | null): void;
};

/** One mention to write: its new sort order. */
type Change = { item: PressMentionAdminDto; sortOrder: number };

export function mentionName(item: PressMentionAdminDto): string {
  return item.title.vi ?? item.title.en ?? `số ${item.id}`;
}

/** "2024-05-01" as "01/05/2024". Text is split, not parsed as a Date, so no time zone can shift the day. */
export function formatDate(iso: string | null): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return match === null ? "" : `${match[3]}/${match[2]}/${match[1]}`;
}

/** The body of a PUT. A PUT replaces the whole mention, so every field is sent again. */
function toBody(item: PressMentionAdminDto, sortOrder: number): PressMentionRequest {
  return {
    url: item.url,
    sourceName: item.sourceName,
    publishedOn: item.publishedOn,
    title: item.title,
    mediaId: item.mediaId,
    sortOrder,
  };
}

/**
 * The mentions to write for moving the item at `index` by `delta`, and the list as it will look.
 * Normally the two items swap their sort orders. If any two mentions in the list share a number, a swap
 * cannot be trusted (the server sorts equal numbers by id), so every item gets its position as its number
 * and only the items whose number changed are written.
 */
function plan(shown: PressMentionAdminDto[], index: number, delta: -1 | 1) {
  const target = index + delta;
  const hasTie = new Set(shown.map((item) => item.sortOrder)).size !== shown.length;
  const next = shown.slice();
  [next[index], next[target]] = [next[target], next[index]];
  const numbered = next.map((item, position) => {
    // Each of the two places keeps its own number; a list with a tie gets position numbers instead.
    if (hasTie) return { ...item, sortOrder: position };
    if (position === index) return { ...item, sortOrder: shown[index].sortOrder };
    if (position === target) return { ...item, sortOrder: shown[target].sortOrder };
    return item;
  });
  const before = new Map(shown.map((item) => [item.id, item.sortOrder]));
  const changes: Change[] = numbered
    .filter((item) => before.get(item.id) !== item.sortOrder)
    .map((item) => ({ item, sortOrder: item.sortOrder }));
  return { next: numbered, changes };
}

type RowProps = {
  item: PressMentionAdminDto;
  index: number;
  count: number;
  busy: boolean;
  selectDisabled: boolean;
  onSelect(item: PressMentionAdminDto): void;
  onMove(index: number, delta: -1 | 1): void;
};

function PressRow({ item, index, count, busy, selectDisabled, onSelect, onMove }: RowProps) {
  const name = mentionName(item);
  const date = formatDate(item.publishedOn);
  return (
    <li className="flex items-center gap-1 rounded-md border bg-card p-2">
      <button
        type="button"
        disabled={selectDisabled}
        onClick={() => onSelect(item)}
        className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-md px-1 text-left disabled:opacity-50"
      >
        <span className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words font-semibold">{name}</span>
          {item.missingEn ? <MissingEnBadge /> : null}
        </span>
        <span className="min-w-0 break-words text-sm text-muted-foreground">
          {item.sourceName}
          {date === "" ? "" : ` · ${date}`}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Đưa bài ${name} lên`}
          disabled={busy || index === 0}
          onClick={() => onMove(index, -1)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Đưa bài ${name} xuống`}
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
 * The press mentions in order, with up and down buttons. There is no order endpoint, so a move is saved with
 * one PUT per mention whose sort order changed (two for a swap), one after the other.
 * - If the first PUT fails nothing was written: the old order comes back and the error shows here.
 * - If a later PUT fails the server order is half changed: `onPartialFailure` tells the parent to load the list again.
 * While a move is saved, every move control is disabled, so a second move cannot start.
 */
export function PressList({ items, refreshing = false, onSelect, onPartialFailure }: Props) {
  // The order the user made. It is dropped when the parent passes a new list (for example after a reload).
  const [seen, setSeen] = useState(items);
  const [ordered, setOrdered] = useState<PressMentionAdminDto[] | null>(null);
  // True after a half-done swap, until the parent passes a new list: the shown order is not the server order.
  const [outOfDate, setOutOfDate] = useState(false);
  const latestItems = useRef(items);
  useLayoutEffect(() => {
    latestItems.current = items;
  });

  const changesToWrite = useRef<Change[]>([]);
  const written = useRef(0);
  const failure = useRef<unknown>(null);
  const reorder = useSave(
    async () => {
      try {
        for (const { item, sortOrder } of changesToWrite.current) {
          await adminFetch<PressMentionAdminDto>(`/admin/press/${item.id}`, { method: "PUT", body: toBody(item, sortOrder) });
          written.current += 1;
        }
      } catch (error) {
        failure.current = error;
        throw error;
      }
      return true;
    },
    { successMessage: null },
  );

  if (seen !== items) {
    setSeen(items);
    setOrdered(null);
    setOutOfDate(false);
    reorder.reset();
  }
  const shown = ordered ?? items;
  const busy = reorder.pending || refreshing || outOfDate;

  async function apply(index: number, delta: -1 | 1) {
    if (busy) return;
    const { next, changes } = plan(shown, index, delta);
    const previous = ordered;
    const loadedFrom = items;
    changesToWrite.current = changes;
    written.current = 0;
    onPartialFailure(null);
    setOrdered(next);
    const saved = await reorder.save();
    if (saved !== undefined) return;
    if (latestItems.current !== loadedFrom) {
      // A reload replaced the list while the save ran: the old order and its error mean nothing now.
      reorder.reset();
    } else if (written.current > 0) {
      // Part of the move is on the server. Show what the server has, not a guess.
      setOutOfDate(true);
      // The parent shows the error; clear it here so it is not shown twice.
      reorder.reset();
      onPartialFailure(failure.current instanceof AdminApiError ? failure.current : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
    } else {
      setOrdered(previous);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ProblemMessage error={reorder.error} />
      <ul className="flex flex-col gap-2">
        {shown.map((item, index) => (
          <PressRow
            key={item.id}
            item={item}
            index={index}
            count={shown.length}
            busy={busy}
            selectDisabled={reorder.pending}
            onSelect={onSelect}
            onMove={(position, delta) => void apply(position, delta)}
          />
        ))}
      </ul>
    </div>
  );
}
