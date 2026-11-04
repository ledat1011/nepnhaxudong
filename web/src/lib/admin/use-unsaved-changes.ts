"use client";

import { useContext, useEffect, useId } from "react";
import { NavGuardContext } from "./nav-guard";

/**
 * While `dirty`:
 * - the browser asks before a reload or a closed tab (`beforeunload`, added only while dirty);
 * - the shell's NavGuardProvider asks before any link to another admin page.
 * The browser back button is not blocked: that would need history tricks that break the real history.
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
      event.preventDefault();
      // Older browsers need a value; the text itself is never shown.
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
