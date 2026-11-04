"use client";

import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";

/** Forms that have unsaved changes tell the guard through `useUnsavedChanges`. */
export type NavGuard = {
  markDirty(id: string): void;
  markClean(id: string): void;
};

export const NavGuardContext = createContext<NavGuard | null>(null);

/** True for a same-origin link to another page. A link that differs only in its #hash stays on the page. */
function leavesPage(anchor: HTMLAnchorElement): boolean {
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

/**
 * One in-app navigation guard for the admin shell. While a form is dirty, a click on any link
 * that goes to another page of this site (admin or public) is held back and the user is asked first.
 * A Next.js `<Link>` is a soft navigation, so `beforeunload` does not fire for it. The check runs in the
 * capture phase of the document, so it needs no change in BottomNav, MoreSheet or any other link.
 * Links to other sites are covered by `beforeunload`. The browser back button is not covered.
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
      if (!leavesPage(anchor)) return;
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
