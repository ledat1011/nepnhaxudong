"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/api";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import { withReLogin } from "@/lib/admin/with-relogin";

const SOURCES = [
  { label: "Sản phẩm", api: "/admin/products", href: ADMIN_ROUTES.products },
  { label: "Hành trình", api: "/admin/timeline", href: ADMIN_ROUTES.timeline },
  { label: "Báo chí", api: "/admin/press", href: ADMIN_ROUTES.press },
  { label: "Câu chuyện", api: "/admin/stories", href: ADMIN_ROUTES.stories },
];

/** A number, nothing yet (still loading), or a failure of this one list. */
type Count = number | null | "failed";

/** How many items of each list still miss their English text. One failing list does not hide the others. */
export function MissingEnSummary() {
  const { requireReLogin } = useAdminSession();
  const [counts, setCounts] = useState<Count[]>(SOURCES.map(() => null));

  useEffect(() => {
    let cancelled = false;
    function settle(index: number, value: Count) {
      if (cancelled) return;
      setCounts((current) => current.map((old, position) => (position === index ? value : old)));
    }
    SOURCES.forEach((source, index) => {
      withReLogin(() => adminFetch<{ missingEn: boolean }[]>(source.api), requireReLogin).then(
        (items) => settle(index, items.filter((item) => item.missingEn).length),
        () => settle(index, "failed"),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [requireReLogin]);

  return (
    <section aria-labelledby="missing-en" className="flex flex-col gap-3">
      <h2 id="missing-en" className="text-lg font-bold">
        Còn thiếu bản tiếng Anh
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {SOURCES.map((source, index) => {
          const count = counts[index];
          return (
            <li key={source.href} className="min-w-0 rounded-lg border bg-card">
              <Link href={source.href} className="flex min-h-11 flex-col gap-1 p-3">
                <span className="min-w-0 break-words text-sm text-muted-foreground">{source.label}</span>
                <span className="text-2xl font-bold">{count === null ? "…" : count === "failed" ? "?" : count}</span>
              </Link>
              {count === "failed" ? (
                <p role="alert" className="px-3 pb-3 text-sm text-destructive">
                  Không tải được.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
