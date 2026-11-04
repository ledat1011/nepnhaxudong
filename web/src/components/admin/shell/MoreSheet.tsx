"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminSession } from "@/lib/admin/session";
import { cn } from "@/lib/admin/utils";
import { Button } from "@/components/admin/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/admin/ui/sheet";
import { MORE_ITEMS, isActivePath } from "./nav-items";

type Props = { open: boolean; onOpenChange(open: boolean): void };

export function MoreSheet({ open, onOpenChange }: Props) {
  const pathname = usePathname();
  const { signOut } = useAdminSession();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="max-h-[85dvh] overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]"
      >
        <SheetHeader>
          <SheetTitle>Thêm</SheetTitle>
        </SheetHeader>
        <ul className="flex flex-col px-2">
          {MORE_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-md px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active && "bg-secondary font-bold",
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2 p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              void signOut();
            }}
          >
            <LogOut aria-hidden />
            Đăng xuất
          </Button>
          <SheetClose asChild>
            <Button type="button" variant="ghost">
              Đóng
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
