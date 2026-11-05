"use client";

import { useSyncExternalStore } from "react";
import { pendingLabel, subscribeNavigationPending } from "./navigation-pending";

// A fixed box, so showing it moves nothing on the page. No animation: it appears at once.
const VISIBLE_CLASS =
  "fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full border-2 border-coat bg-straw px-5 py-2 font-bold text-earth";

/**
 * The one status region for page loading, in the layout. It is always present (empty while
 * idle), so screen readers announce the text when a link waits (see `LinkPendingStatus`).
 */
export function NavigationStatus() {
  const label = useSyncExternalStore(subscribeNavigationPending, pendingLabel, () => null);
  return (
    <p role="status" className={label !== null ? VISIBLE_CLASS : "sr-only"}>
      {label ?? ""}
    </p>
  );
}
