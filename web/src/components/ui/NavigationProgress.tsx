"use client";

import { useSyncExternalStore } from "react";
import { isNavigationPending, subscribeNavigationPending } from "./navigation-pending";

/**
 * Thin rice-gold bar on the top edge while a page navigation waits longer than
 * `PENDING_NOTE_DELAY_MS` (see `LinkPendingStatus`). It is fixed, so it takes no layout space.
 * It is hidden from screen readers: the text note of `LinkPendingStatus` is the one status
 * they hear. With motion allowed it grows from left to right for 4 seconds and then holds;
 * under reduced motion it is a still, full-width bar.
 */
export function NavigationProgress() {
  const pending = useSyncExternalStore(
    subscribeNavigationPending,
    isNavigationPending,
    () => false,
  );
  if (!pending) return null;
  return (
    <div
      data-navigation-progress
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1"
    >
      <div className="h-full origin-left border-b border-coat bg-grain motion-safe:animate-nav-progress" />
    </div>
  );
}
