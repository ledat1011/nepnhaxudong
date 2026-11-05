"use client";

import { ChevronRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useContext, useEffect, useId, useState } from "react";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { useAdminSession } from "@/lib/admin/session";
import { withReLogin } from "@/lib/admin/with-relogin";
import { TodoCountContext } from "@/components/admin/shell/todo-count";
import { buildTodos, TODO_SOURCES, type Todo, type TodoSection, type TodoSources } from "./todo";

type SourceKey = keyof TodoSources;

const SOURCES = TODO_SOURCES;

const SECTIONS: { key: TodoSection; title: string }[] = [
  { key: "settings", title: "Liên hệ & cài đặt" },
  { key: "stories", title: "Câu chuyện" },
  { key: "products", title: "Sản phẩm" },
  { key: "timeline", title: "Hành trình" },
  { key: "press", title: "Báo chí" },
];

/** Rows shown per screen before "Xem thêm". */
const SHOWN = 5;

/**
 * What is still missing on the website, as a list of jobs. Each row links to the screen and the field that fixes
 * it. It is worked out from the admin lists the API already has (six requests at the same time).
 */
export function TodoList() {
  const { requireReLogin } = useAdminSession();
  const [sources, setSources] = useState<TodoSources>({});
  const [failed, setFailed] = useState<SourceKey[]>([]);
  const [loading, setLoading] = useState(true);
  const headingId = useId();

  const load = useCallback(
    async (keys: SourceKey[], isCancelled: () => boolean) => {
      const wanted = SOURCES.filter((source) => keys.includes(source.key));
      const results = await Promise.allSettled(
        wanted.map((source) => withReLogin(() => adminFetch<unknown>(source.api), requireReLogin)),
      );
      if (isCancelled()) return;
      const loaded: TodoSources = {};
      const failures: SourceKey[] = [];
      results.forEach((result, index) => {
        const key = wanted[index].key;
        if (result.status === "fulfilled") Object.assign(loaded, { [key]: result.value });
        else failures.push(key);
      });
      setSources((current) => ({ ...current, ...loaded }));
      setFailed(failures);
      setLoading(false);
    },
    [requireReLogin],
  );

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the requests; state changes only after they answer
    void load(
      SOURCES.map((source) => source.key),
      () => cancelled,
    );
    return () => {
      cancelled = true;
    };
  }, [load]);

  function retry() {
    setLoading(true);
    void load(failed, () => false);
  }

  const firstLoad = loading && Object.keys(sources).length === 0;
  const todos = firstLoad ? [] : buildTodos(sources);

  // The badge on the "Tổng quan" menu item shows the same number as this list.
  const todoCount = useContext(TodoCountContext);
  const shownCount = loading ? null : todos.length;
  useEffect(() => {
    if (shownCount !== null) todoCount?.publish(shownCount);
  }, [todoCount, shownCount]);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-bold">
        Việc cần làm{!firstLoad && todos.length > 0 ? ` (${todos.length})` : ""}
      </h2>
      {loading ? (
        <p role="status" className="text-muted-foreground">
          Đang kiểm tra nội dung…
        </p>
      ) : null}
      {!loading && failed.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Chưa kiểm tra được: {SOURCES.filter((source) => failed.includes(source.key)).map((source) => source.label).join(", ")}.
          </p>
          <Button type="button" variant="outline" onClick={retry}>
            Thử lại
          </Button>
        </div>
      ) : null}
      {!loading && failed.length === 0 && todos.length === 0 ? (
        <p className="flex items-center gap-3 rounded-lg border bg-card p-3 font-medium">
          <CircleCheck aria-hidden="true" className="size-6 shrink-0 text-primary" />
          Mọi thứ đã đủ. Không còn việc nào cần làm.
        </p>
      ) : null}
      {!firstLoad
        ? SECTIONS.map((section) => {
            const rows = todos.filter((todo) => todo.section === section.key);
            return rows.length > 0 ? <TodoGroup key={section.key} title={section.title} rows={rows} /> : null;
          })
        : null}
    </section>
  );
}

function TodoGroup({ title, rows }: { title: string; rows: Todo[] }) {
  const [all, setAll] = useState(false);
  const headingId = useId();
  const shown = all ? rows : rows.slice(0, SHOWN);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-base font-semibold">
        {title} ({rows.length})
      </h3>
      <ul className="flex flex-col gap-2">
        {shown.map((todo) => (
          <li key={todo.id}>
            <Link
              href={todo.href}
              className="flex min-h-11 items-center gap-3 rounded-md border bg-card p-3 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-secondary"
            >
              <span className="min-w-0 flex-1 break-words">{todo.text}</span>
              {/* The chevron says the row opens another screen. */}
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > SHOWN && !all ? (
        <Button type="button" variant="outline" onClick={() => setAll(true)}>
          Xem thêm {rows.length - SHOWN} việc
        </Button>
      ) : null}
    </section>
  );
}
