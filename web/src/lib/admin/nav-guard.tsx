"use client";

import { useRouter } from "next/navigation";
import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ADMIN_ROUTES } from "./routes";

/** Forms that have unsaved changes tell the guard through `useUnsavedChanges`. */
export type NavGuard = {
  /** `keepsDraft`: the form keeps its text in the browser (the story editor), so leaving loses nothing. */
  markDirty(id: string, keepsDraft?: boolean): void;
  markClean(id: string): void;
  /** Runs `go` at once when no form is dirty. Otherwise asks first, and runs `go` only after "Rời trang". */
  confirmLeave(go: () => void): void;
  /**
   * For a form that navigates by itself (after a create or a delete): removes the extra history entry
   * of the back-button guard first, then runs `go`. Removing it later would cancel the navigation.
   */
  leaveTo(go: () => void): void;
  /** True after the user chose to leave: the browser must not ask a second time (`beforeunload`). */
  isLeaving(): boolean;
};

export const NavGuardContext = createContext<NavGuard | null>(null);

/** Marks the extra history entry that catches the back button while a form is dirty. */
const TRAP_KEY = "nepNhaUnsavedTrap";

function isTrapState(state: unknown): boolean {
  return typeof state === "object" && state !== null && (state as Record<string, unknown>)[TRAP_KEY] === true;
}

/** True for a same-origin link to another page. A link that differs only in its #hash stays on the page. */
function leavesPage(anchor: HTMLAnchorElement): boolean {
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

/** A link inside the story editor is text being edited, not a way off the page. */
function insideEditableText(anchor: HTMLAnchorElement): boolean {
  return anchor.isContentEditable || anchor.closest('[contenteditable="true"]') !== null;
}

/** The navigation that waits for the user's answer. */
type Held = { go(): void };

const LOST_TEXT = "Nếu rời trang, những thay đổi này sẽ mất.";
const KEPT_TEXT =
  "Bài đang viết dở vẫn được giữ trên máy này. Lần sau mở lại bài, trang sẽ hỏi bạn có muốn khôi phục không.";

type TrapState = {
  /** True while the extra entry is on the history stack because a form is dirty. */
  armed: boolean;
  /**
   * True after the user chose to leave, until a form becomes dirty again. Also reset when the question opens
   * again or on the next back press: then the earlier navigation did not happen and the form still needs guarding.
   */
  leaving: boolean;
  /** True while the question is open because of the back button (not because of a link). */
  askingBack: boolean;
  /** Popstate events that come from our own `history.back()` and must not open the dialog. */
  ignorePops: number;
  /** Runs after the last ignored popstate, when the extra entry is gone. */
  afterPop: (() => void) | null;
};

/**
 * One navigation guard for the admin shell. While a form is dirty:
 * - A click on any link to another page of this site (admin or public) is held back and the user is asked first.
 *   A Next.js `<Link>` is a soft navigation, so `beforeunload` does not fire for it. The check runs in the
 *   capture phase of the document, so it needs no change in BottomNav, MoreSheet or any other link.
 * - The browser back button (and the Android back gesture) is caught: the guard pushes one extra history entry
 *   with the same URL. Going back leaves that entry; the guard pushes it again and asks. "Rời trang" goes back
 *   past both entries. The entry is removed again when the form becomes clean.
 * Links to other sites, a reload and a closed tab are covered by `beforeunload` in `useUnsavedChanges`.
 */
export function NavGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  // Each dirty form, and whether it keeps a draft in the browser.
  const dirtyIds = useRef(new Map<string, boolean>());
  const passThrough = useRef(false);
  const trapRef = useRef<TrapState>({
    armed: false,
    leaving: false,
    askingBack: false,
    ignorePops: 0,
    afterPop: null,
  });
  const [held, setHeld] = useState<Held | null>(null);
  // Read when the question opens: true only when every dirty form keeps a draft.
  const [allKept, setAllKept] = useState(false);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const machine = useMemo(() => {
    const trap = trapRef.current;

    function arm() {
      // While our own back() is on its way, the popstate handler arms again when it arrives.
      if (trap.armed || trap.leaving || trap.ignorePops > 0) return;
      trap.armed = true;
      // After a reload the current entry can still be the extra entry: it is used again, not doubled.
      if (!isTrapState(window.history.state)) window.history.pushState({ [TRAP_KEY]: true }, "");
    }

    function disarm() {
      if (!trap.armed) return;
      trap.armed = false;
      // Only while the extra entry is the current one. After a navigation it is not, and going back would undo it.
      if (isTrapState(window.history.state)) {
        trap.ignorePops += 1;
        window.history.back();
      }
    }

    function sync() {
      if (dirtyIds.current.size > 0) {
        arm();
      } else if (trap.askingBack) {
        // The back button was pressed while a save ran, and the save has now ended: nothing is lost,
        // so close the question and finish the back press. When the form already leaves by itself (`leaveTo`
        // after a create) or our own back() is on its way, that navigation wins: a second one would fight it.
        close();
        if (!trap.leaving && trap.ignorePops === 0) goBack();
      } else {
        disarm();
      }
    }

    /** Opens the question. A new question means an earlier "Rời trang" did not leave, so guard again. */
    function ask(request: Held, back: boolean) {
      trap.leaving = false;
      trap.askingBack = back;
      setAllKept(dirtyIds.current.size > 0 && [...dirtyIds.current.values()].every(Boolean));
      setHeld(request);
      sync();
    }

    function close() {
      trap.askingBack = false;
      setHeld(null);
    }

    function leaveTo(go: () => void) {
      trap.leaving = true;
      if (trap.armed && isTrapState(window.history.state)) {
        trap.ignorePops += 1;
        window.history.back();
      }
      trap.armed = false;
      // A navigation started before that popstate arrives would be cancelled by the browser's traversal.
      if (trap.ignorePops > 0) trap.afterPop = go;
      else go();
    }

    /** "Rời trang" after the back button: skip the extra entry (when it is the current one) and the page itself. */
    function goBack() {
      // Counted from the real state: a save that ended in the meantime can have removed the extra entry already.
      const steps = isTrapState(window.history.state) ? 2 : 1;
      // The extra entry has nothing after it, so length is its position + 1. Without it, the extra entry is the
      // one entry after the page. Either way the page is at position length - 2, and there is an entry before it.
      if (window.history.length > 2) {
        trap.leaving = true;
        trap.armed = false;
        // Our own traversal: its popstate is not a new back press.
        trap.ignorePops += 1;
        window.history.go(-steps);
      } else {
        // The page was the first one of the tab: there is nothing to go back to, so open the admin home.
        leaveTo(() => routerRef.current.replace(ADMIN_ROUTES.home));
      }
    }

    function onPopState(event: PopStateEvent) {
      if (trap.ignorePops > 0) {
        trap.ignorePops -= 1;
        if (trap.ignorePops === 0) {
          const go = trap.afterPop;
          trap.afterPop = null;
          go?.();
        }
        sync();
        return;
      }
      // A back press after "Rời trang" whose navigation never happened: beforeunload must ask again.
      trap.leaving = false;
      const onTrap = isTrapState(event.state);
      if (trap.armed && !onTrap) {
        // The back button left the extra entry while a form is dirty: put it back and ask.
        trap.armed = false;
        ask({ go: goBack }, true);
        return;
      }
      // A clean page landed on an old extra entry (its form went away before it could be removed): skip it.
      if (!trap.armed && onTrap && dirtyIds.current.size === 0) {
        trap.ignorePops += 1;
        window.history.back();
      }
    }

    const guard: NavGuard = {
      markDirty(id, keepsDraft = false) {
        if (dirtyIds.current.size === 0) trap.leaving = false;
        dirtyIds.current.set(id, keepsDraft);
        sync();
      },
      markClean(id) {
        dirtyIds.current.delete(id);
        sync();
      },
      confirmLeave(go) {
        if (dirtyIds.current.size === 0) go();
        else ask({ go: () => leaveTo(go) }, false);
      },
      leaveTo,
      isLeaving: () => trap.leaving,
    };
    /**
     * At mount the current entry can be an old extra entry: after a reload or a restored tab, Next.js keeps
     * the custom history state. A clean page removes it at once; a dirty form uses it again.
     */
    function start() {
      // Under Strict Mode the effect runs twice: the back() of the first run is still on its way.
      if (trap.ignorePops > 0) return;
      trap.armed = isTrapState(window.history.state);
      sync();
    }

    return { guard, onPopState, start, ask, close };
  }, []);

  useEffect(() => {
    const { onPopState, start } = machine;
    // Next.js's own popstate listener must run before this one. Next.js restores the route of the entry the
    // browser went to (from `event.state` and the URL); this listener may then push the extra entry again in
    // the same event. Listeners on `window` run in the order they were added. Next.js adds its listener when
    // the app router mounts; NavGuardProvider mounts later, only after the session has loaded (AppShell shows
    // "Đang tải…" first), so its listener comes second. Keep it that way if the provider ever moves up.
    window.addEventListener("popstate", onPopState);
    start();
    return () => {
      window.removeEventListener("popstate", onPopState);
      // The shell goes away (for example the session ended): the forms that unmount next must not finish
      // a back press. React runs this cleanup before the cleanups of the children.
      machine.close();
    };
  }, [machine]);

  useEffect(() => {
    /** Clicks the same link again, so its own handlers run (Next.js navigation, closing the More sheet). */
    function clickThrough(anchor: HTMLAnchorElement) {
      passThrough.current = true;
      try {
        anchor.click();
      } finally {
        passThrough.current = false;
      }
    }

    function onClick(event: MouseEvent) {
      if (passThrough.current || dirtyIds.current.size === 0) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (anchor === null || (anchor.target !== "" && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      if (insideEditableText(anchor) || !leavesPage(anchor)) return;
      event.preventDefault();
      event.stopPropagation();
      machine.ask({ go: () => machine.guard.leaveTo(() => clickThrough(anchor)) }, false);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [machine]);

  function leave() {
    const request = held;
    machine.close();
    request?.go();
  }

  return (
    <NavGuardContext.Provider value={machine.guard}>
      {children}
      <ConfirmDialog
        open={held !== null}
        onOpenChange={(open) => {
          if (!open) machine.close();
        }}
        title="Bạn có thay đổi chưa lưu. Rời trang?"
        description={allKept ? KEPT_TEXT : LOST_TEXT}
        confirmLabel="Rời trang"
        cancelLabel="Ở lại"
        destructive
        onConfirm={leave}
      />
    </NavGuardContext.Provider>
  );
}
