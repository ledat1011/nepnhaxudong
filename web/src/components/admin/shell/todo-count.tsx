"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildTodos, TODO_SOURCES, type TodoSources } from "@/components/admin/dashboard/todo";
import { adminFetch } from "@/lib/admin/api";
import { ADMIN_ROUTES } from "@/lib/admin/routes";

type TodoCount = {
  /** The number of jobs in "Việc cần làm", or `null` while it is not known. */
  count: number | null;
  /** The to-do list of Tổng quan gives its own count here after it has loaded. */
  publish(count: number): void;
};

export const TodoCountContext = createContext<TodoCount | null>(null);

/** A count older than this is worked out again when the user opens another screen. */
const REFRESH_MS = 60_000;

/** Reads the six lists of the to-do list. A list that fails is left out; a session that ended is not asked about here. */
async function countTodos(): Promise<number | null> {
  const results = await Promise.allSettled(TODO_SOURCES.map((source) => adminFetch<unknown>(source.api)));
  const sources: TodoSources = {};
  results.forEach((result, index) => {
    if (result.status === "fulfilled") Object.assign(sources, { [TODO_SOURCES[index].key]: result.value });
  });
  return Object.keys(sources).length === 0 ? null : buildTodos(sources).length;
}

/**
 * Keeps the number of to-do jobs for the badge on the "Tổng quan" menu item, so the family sees that work is left
 * without opening Tổng quan. On Tổng quan the to-do list gives the number; elsewhere it is counted at most once a
 * minute, when the user moves to another screen.
 */
export function TodoCountProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  const countedAt = useRef<number | null>(null);

  useEffect(() => {
    if (pathname === ADMIN_ROUTES.home) return;
    const now = Date.now();
    if (countedAt.current !== null && now - countedAt.current < REFRESH_MS) return;
    countedAt.current = now;
    // No cancel: a late answer is still the newest count, and the badge is not tied to one screen.
    void countTodos().then(
      (value) => {
        if (value !== null) setCount(value);
      },
      () => undefined,
    );
  }, [pathname]);

  const publish = useCallback((value: number) => {
    countedAt.current = Date.now();
    setCount(value);
  }, []);

  const value = useMemo(() => ({ count, publish }), [count, publish]);
  return <TodoCountContext.Provider value={value}>{children}</TodoCountContext.Provider>;
}

/** The number of to-do jobs, or `null` (unknown, or outside the shell). */
export function useTodoCount(): number | null {
  return useContext(TodoCountContext)?.count ?? null;
}

/** The words a screen reader adds to the "Tổng quan" link. Empty when there is no badge. */
export function todoCountLabel(count: number | null): string {
  return count !== null && count > 0 ? `, ${count} việc cần làm` : "";
}

/**
 * A small round number on the "Tổng quan" item. Hidden from screen readers: the link's own name says the number
 * (see `todoCountLabel`). Nothing when there is nothing to do.
 */
export function TodoBadge({ count, className = "" }: { count: number | null; className?: string }) {
  if (count === null || count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[13px] leading-none font-bold text-primary-foreground tabular-nums ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
