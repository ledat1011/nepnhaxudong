"use client";

import { useCallback, useContext, useEffect, useId } from "react";
import { NavGuardContext } from "./nav-guard";

/**
 * While `dirty`:
 * - the browser asks before a reload or a closed tab (`beforeunload`, added only while dirty);
 * - the shell's NavGuardProvider asks before any link to another page and before the browser back button
 *   (one extra history entry with the same URL, removed again when the form is clean).
 */
export function useUnsavedChanges(dirty: boolean): void {
  const guard = useContext(NavGuardContext);
  const id = useId();

  useEffect(() => {
    if (!dirty || guard === null) return;
    guard.markDirty(id);
    return () => guard.markClean(id);
  }, [dirty, guard, id]);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      // The user already answered "Rời trang" in the admin's own dialog.
      if (guard?.isLeaving()) return;
      event.preventDefault();
      // Older browsers need a value; the text itself is never shown.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, guard]);
}

/**
 * For an action that leaves the page, such as signing out: runs it at once when no form is dirty,
 * otherwise asks with the same "Rời trang?" dialog first.
 */
export function useConfirmLeave(): (go: () => void) => void {
  const guard = useContext(NavGuardContext);
  return useCallback((go: () => void) => (guard === null ? go() : guard.confirmLeave(go)), [guard]);
}

/**
 * For a form that navigates by itself after a create or a delete. `go` (the router call) runs after the
 * back-button guard has removed its extra history entry; a navigation started earlier would be cancelled.
 */
export function useLeavePage(): (go: () => void) => void {
  const guard = useContext(NavGuardContext);
  return useCallback((go: () => void) => (guard === null ? go() : guard.leaveTo(go)), [guard]);
}
