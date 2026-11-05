"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** How long "Hoàn tác" stays on screen. Long enough for an older user to read the message and tap. */
export const UNDO_MS = 10_000;

type ToastId = string | number;
type Key = string | number;
type Removed = { key: Key; before: Set<Key>; after: Set<Key> };

/** The open "Hoàn tác" messages of one form, so the form can close them all (after "Bỏ thay đổi" or a save). */
export type UndoGroup = { add(id: ToastId): void; remove(id: ToastId): void; dismissAll(): void };

/** Given by a form to the lists inside it. Without it, a list still closes its own messages when it goes away. */
export const UndoGroupContext = createContext<UndoGroup | null>(null);

export function useUndoGroup(): UndoGroup {
  const [group] = useState<UndoGroup>(() => {
    const ids = new Set<ToastId>();
    return {
      add: (id) => void ids.add(id),
      remove: (id) => void ids.delete(id),
      dismissAll: () => {
        for (const id of ids) toast.dismiss(id);
        ids.clear();
      },
    };
  });
  return group;
}

type Options<T> = {
  /** What tells two rows apart (a row key, an image id). A row that is in the list again is not added twice. */
  keyOf(row: T): Key;
  /** The most rows the list may have. "Hoàn tác" does nothing when the list is full. */
  max?: number;
};

/**
 * Removes one row of a list in a form at once, and shows a message with "Hoàn tác" for `UNDO_MS`.
 * "Hoàn tác" puts the row back after the rows that were before it (rows removed earlier count too), in the list
 * as it is then, so what the user typed or removed meanwhile stays. A row that is back in the list already, or a
 * full list, is left as it is. The messages close when the list goes away.
 */
export function useRemoveWithUndo<T>(
  rows: T[],
  onChange: (rows: T[]) => void,
  { keyOf, max }: Options<T>,
): (index: number, message: string) => void {
  const latest = useRef({ rows, onChange, keyOf, max });
  // Updated after each commit, before the next tap can arrive (see useSave).
  useLayoutEffect(() => {
    latest.current = { rows, onChange, keyOf, max };
  });
  const group = useContext(UndoGroupContext);

  const open = useRef(new Set<ToastId>());
  // Rows removed whose "Hoàn tác" is still on screen, with the rows that were before and after each one.
  const pending = useRef(new Map<ToastId, Removed>());
  useEffect(() => {
    const messages = open.current;
    const removedRows = pending.current;
    return () => {
      for (const id of messages) toast.dismiss(id);
      messages.clear();
      removedRows.clear();
    };
  }, []);

  return useCallback(
    (index: number, message: string) => {
      const { rows: current, onChange: change, keyOf: key } = latest.current;
      if (index < 0 || index >= current.length) return;
      const removed = current[index];
      const own = key(removed);
      const keys = current.map(key);
      // A row removed earlier and not restored yet still counts: it was before this row if this row was after it.
      const before = new Set<Key>(keys.slice(0, index));
      const after = new Set<Key>(keys.slice(index + 1));
      for (const other of pending.current.values()) {
        if (other.after.has(own)) before.add(other.key);
        if (other.before.has(own)) after.add(other.key);
      }
      change(current.filter((_, i) => i !== index));

      const forget = (id: ToastId) => {
        open.current.delete(id);
        pending.current.delete(id);
        group?.remove(id);
      };
      const id: ToastId = toast(message, {
        duration: UNDO_MS,
        action: {
          label: "Hoàn tác",
          onClick: () => {
            forget(id);
            restore();
          },
        },
        onDismiss: () => forget(id),
        onAutoClose: () => forget(id),
      });
      open.current.add(id);
      pending.current.set(id, { key: own, before, after });
      group?.add(id);

      function restore() {
        const { rows: now, onChange: apply, keyOf: keyNow, max: limit } = latest.current;
        const nowKeys = now.map(keyNow);
        if (nowKeys.includes(own)) {
          toast("Mục này đã có lại trong danh sách.");
          return;
        }
        if (limit !== undefined && now.length >= limit) {
          toast(`Không hoàn tác được: danh sách đã đủ ${limit} mục.`);
          return;
        }
        const at = placeFor(nowKeys);
        apply([...now.slice(0, at), removed, ...now.slice(at)]);
      }

      /** After the last row that was before it; else before the first row that was after it; else its old index. */
      function placeFor(nowKeys: Key[]): number {
        const lastBefore = nowKeys.findLastIndex((k) => before.has(k));
        if (lastBefore !== -1) return lastBefore + 1;
        const firstAfter = nowKeys.findIndex((k) => after.has(k));
        if (firstAfter !== -1) return firstAfter;
        return Math.min(index, nowKeys.length);
      }
    },
    [group],
  );
}
