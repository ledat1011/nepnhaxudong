"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/LogoMark";
import { Button } from "@/components/admin/ui/button";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import { useConfirmLeave } from "@/lib/admin/use-unsaved-changes";
import { cn } from "@/lib/admin/utils";
import { moreItemsFor } from "./nav-access";
import { NAV_ITEMS, isActivePath, type NavItem } from "./nav-items";
import { TodoBadge, todoCountLabel, useTodoCount } from "./todo-count";

const ITEM_CLASS =
  "flex min-h-11 items-center gap-3 rounded-md px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
const ACTIVE_CLASS = "bg-secondary font-bold text-secondary-foreground";
const IDLE_CLASS = "text-foreground hover:bg-muted active:bg-secondary";

/**
 * The menu of a laptop or a tablet held sideways (1024 px and wider), on the left. A wide screen has room for every
 * screen at once, so the "Thêm" sheet of the phone is not needed here. The order is the phone's: the four daily
 * screens first, then the "Thêm" list.
 */
export function SideNav() {
  const pathname = usePathname();
  const { signOut, user } = useAdminSession();
  const confirmLeave = useConfirmLeave();
  const todoCount = useTodoCount();

  const item = ({ label, href, icon: Icon }: NavItem) => {
    const active = isActivePath(pathname, href);
    const home = href === ADMIN_ROUTES.home;
    return (
      <li key={href}>
        <Link href={href} aria-current={active ? "page" : undefined} className={cn(ITEM_CLASS, active ? ACTIVE_CLASS : IDLE_CLASS)}>
          <Icon aria-hidden className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">
            {label}
            {home && todoCountLabel(todoCount) ? <span className="sr-only">{todoCountLabel(todoCount)}</span> : null}
          </span>
          {home ? <TodoBadge count={todoCount} /> : null}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Menu bên"
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-4 overflow-y-auto border-r bg-card p-3 lg:flex"
    >
      {/* The family's mark, as on the public site: the admin is part of Nếp Nhà, not a generic tool. */}
      <p className="flex items-center gap-2 px-2 pt-1">
        <LogoMark className="size-9 shrink-0" />
        <span className="flex flex-col leading-tight">
          <span className="font-display text-xl text-earth">Nếp Nhà</span>
          <span className="text-sm text-muted-foreground">Quản trị</span>
        </span>
      </p>
      <ul className="flex flex-col gap-1">{NAV_ITEMS.map(item)}</ul>
      <ul className="flex flex-col gap-1 border-t pt-3">{moreItemsFor(user?.role).map(item)}</ul>
      <div className="mt-auto pt-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          // Signing out leaves the page, so a form with unsaved changes asks first.
          onClick={() => confirmLeave(() => void signOut())}
        >
          <LogOut aria-hidden />
          Đăng xuất
        </Button>
      </div>
    </nav>
  );
}
