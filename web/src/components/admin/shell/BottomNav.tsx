"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/admin/utils";
import { MoreSheet } from "./MoreSheet";
import { NAV_ITEMS, isActivePath, isMoreActive } from "./nav-items";

const ITEM_CLASS =
  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
const ACTIVE_CLASS = "bg-secondary font-bold text-secondary-foreground";
const IDLE_CLASS = "text-muted-foreground";

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = isMoreActive(pathname);

  return (
    <>
      <nav
        aria-label="Menu chính"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(ITEM_CLASS, active ? ACTIVE_CLASS : IDLE_CLASS)}
                >
                  <Icon aria-hidden className="size-5" />
                  <span>{label}</span>
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
              <span>Thêm</span>
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
