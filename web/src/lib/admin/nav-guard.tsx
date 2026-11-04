"use client";

import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ADMIN_ROUTES } from "./routes";

/** Forms that have unsaved changes tell the guard through `useUnsavedChanges`. */
export type NavGuard = {
  markDirty(id: string): void;
  markClean(id: string): void;
};

export const NavGuardContext = createContext<NavGuard | null>(null);

function isAdminLink(anchor: HTMLAnchorElement): boolean {
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  const insideAdmin = url.pathname === ADMIN_ROUTES.home || url.pathname.startsWith(`${ADMIN_ROUTES.home}/`);
  const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
  return insideAdmin && !samePage;
}

/**
 * One in-app navigation guard for the admin shell. While a form is dirty, a click on any link
 * that goes to another admin page is held back and the user is asked first. The check runs in the
 * capture phase of the document, so it needs no change in BottomNav, MoreSheet or any other link.
 * The browser back button is not covered: only `beforeunload` (reload, close tab) is.
 */
export function NavGuardProvider({ children }: { children: ReactNode }) {
  const dirtyIds = useRef(new Set<string>());
  const passThrough = useRef(false);
  const [held, setHeld] = useState<HTMLAnchorElement | null>(null);

  const guard = useMemo<NavGuard>(
    () => ({
      markDirty: (id) => void dirtyIds.current.add(id),
      markClean: (id) => void dirtyIds.current.delete(id),
    }),
    [],
  );

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (passThrough.current || dirtyIds.current.size === 0) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (anchor === null || (anchor.target !== "" && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      if (!isAdminLink(anchor)) return;
      event.preventDefault();
      event.stopPropagation();
      setHeld(anchor);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  function leave() {
    const anchor = held;
    setHeld(null);
    if (anchor === null) return;
    // Click the same link again, so its own handlers run (Next.js navigation, closing the More sheet).
    passThrough.current = true;
    try {
      anchor.click();
    } finally {
      passThrough.current = false;
    }
  }

  return (
    <NavGuardContext.Provider value={guard}>
      {children}
      <ConfirmDialog
        open={held !== null}
        onOpenChange={(open) => {
          if (!open) setHeld(null);
        }}
        title="Bạn có thay đổi chưa lưu. Rời trang?"
        description="Nếu rời trang, những thay đổi này sẽ mất."
        confirmLabel="Rời trang"
        cancelLabel="Ở lại"
        destructive
        onConfirm={leave}
      />
    </NavGuardContext.Provider>
  );
}
