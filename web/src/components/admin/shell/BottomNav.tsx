"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/admin/utils";
import { MoreSheet } from "./MoreSheet";
import { NAV_ITEMS, isActivePath, isMoreActive } from "./nav-items";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { TodoBadge, todoCountLabel, useTodoCount } from "./todo-count";

// 13 px labels: 12 px was hard to read for older eyes, and 14 px does not fit "Câu chuyện" on a 360 px phone.
const ITEM_CLASS =
  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-center text-[13px] leading-tight font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

/*
 * Column widths follow the label widths (Tổng quan, Sản phẩm, Câu chuyện, Ảnh, Thêm), inside a 12 px side margin.
 * Equal columns put "Tổng quan" 7 px from the screen edge and pressed "Câu chuyện" against its neighbours.
 * The narrowest column is still about 57 px wide on a 360 px phone, above the 44 px tap target.
 */
const COLUMNS =
  "grid-cols-[minmax(0,1.1fr)_minmax(0,1.05fr)_minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]";
const ACTIVE_CLASS = "bg-secondary font-bold text-secondary-foreground";
const IDLE_CLASS = "text-muted-foreground hover:text-foreground active:bg-muted";

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMoreActive(pathname);
  const todoCount = useTodoCount();

  return (
    <>
      <nav
        aria-label="Menu chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className={cn("grid px-3", COLUMNS)}>
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            const home = href === ADMIN_ROUTES.home;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(ITEM_CLASS, active ? ACTIVE_CLASS : IDLE_CLASS)}
                >
                  {/* The badge sits on the corner of the icon, so the label keeps its width. */}
                  <span className="relative">
                    <Icon aria-hidden className="size-5" />
                    {home ? <TodoBadge count={todoCount} className="absolute -top-2 left-3.5" /> : null}
                  </span>
                  <span data-nav-label>{label}</span>
                  {home && todoCountLabel(todoCount) ? <span className="sr-only">{todoCountLabel(todoCount)}</span> : null}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-current={moreActive ? "page" : undefined}
              aria-haspopup="dialog"
              onClick={() => setMoreOpen(true)}
              className={cn(ITEM_CLASS, moreActive ? ACTIVE_CLASS : IDLE_CLASS)}
            >
              <Menu aria-hidden className="size-5" />
              <span data-nav-label>Thêm</span>
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
