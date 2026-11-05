"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";
import { markNavigationPending } from "./navigation-pending";

/**
 * How long a navigation may wait before the note shows. A prefetched or fast page arrives
 * sooner, so it shows nothing: no flash of the box and no announcement.
 */
export const PENDING_NOTE_DELAY_MS = 250;

/**
 * Loading state of a link to a page that is rendered on request. Put it inside a next/link
 * `Link`. It draws nothing itself: when the next page is still loading after
 * `PENDING_NOTE_DELAY_MS`, it hands its label to the shared store. The one status region of the
 * page (`NavigationStatus`) shows and announces it, and the top bar (`NavigationProgress`)
 * shows too. One region for the page, not one per link, so screen readers meet one live region.
 */
export function LinkPendingStatus({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  const [waitedLong, setWaitedLong] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setWaitedLong(true), PENDING_NOTE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setWaitedLong(false);
    };
  }, [pending]);

  const shown = pending && waitedLong;
  useEffect(() => {
    if (!shown) return;
    return markNavigationPending(label);
  }, [shown, label]);

  return null;
}
