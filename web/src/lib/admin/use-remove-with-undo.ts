"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { toast } from "sonner";

/** How long "Hoàn tác" stays on screen. Long enough for an older user to read the message and tap. */
export const UNDO_MS = 10_000;

/**
 * Removes one row of a list in a form at once, and shows a message with "Hoàn tác" for `UNDO_MS`.
 * "Hoàn tác" puts the row back at its place in the list as it is then, so what the user typed meanwhile stays.
 * The messages close when the form goes away: "Hoàn tác" must not reach a form that is no longer on screen.
 */
export function useRemoveWithUndo<T>(rows: T[], onChange: (rows: T[]) => void): (index: number, message: string) => void {
  const latest = useRef({ rows, onChange });
  // Updated after each commit, before the next tap can arrive (see useSave).
  useLayoutEffect(() => {
    latest.current = { rows, onChange };
  });

  const open = useRef(new Set<string | number>());
  useEffect(() => {
    const messages = open.current;
    return () => {
      for (const id of messages) toast.dismiss(id);
      messages.clear();
    };
  }, []);

  return useCallback((index: number, message: string) => {
    const current = latest.current.rows;
    if (index < 0 || index >= current.length) return;
    const removed = current[index];
    latest.current.onChange(current.filter((_, i) => i !== index));
    const id = toast(message, {
      duration: UNDO_MS,
      action: {
        label: "Hoàn tác",
        onClick: () => {
          open.current.delete(id);
          const { rows: now, onChange: change } = latest.current;
          const at = Math.min(index, now.length);
          change([...now.slice(0, at), removed, ...now.slice(at)]);
        },
      },
      onDismiss: () => open.current.delete(id),
      onAutoClose: () => open.current.delete(id),
    });
    open.current.add(id);
  }, []);
}
