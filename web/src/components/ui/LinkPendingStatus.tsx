"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { markNavigationPending } from "./navigation-pending";

/**
 * How long a navigation may wait before the note shows. A prefetched or fast page arrives
 * sooner, so it shows nothing: no flash of the box and no announcement.
 */
export const PENDING_NOTE_DELAY_MS = 250;

// A fixed box, so showing it moves nothing on the page. No animation: it appears at once.
const VISIBLE_CLASS =
  "fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full border-2 border-coat bg-straw px-5 py-2 font-bold text-earth";

const noSubscription = () => () => {};

/**
 * Loading state of a link to a page that is rendered on request (the story list and the story
 * pages). Put it inside a next/link `Link`: when the next page is still loading after
 * `PENDING_NOTE_DELAY_MS`, it shows the label until the page arrives. The status region is
 * always present (empty when idle), so screen readers announce the text. It is rendered into
 * the body, outside the link and its moving ancestors. While the label shows, the top loading
 * bar (`NavigationProgress`) shows too: both use this one delay.
 */
export function LinkPendingStatus({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  const [waitedLong, setWaitedLong] = useState(false);
  // The body exists only in the browser: render nothing on the server and in hydration.
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

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
    return markNavigationPending();
  }, [shown]);

  if (!inBrowser) return null;
  return createPortal(
    <p role="status" className={shown ? VISIBLE_CLASS : "sr-only"}>
      {shown ? label : ""}
    </p>,
    document.body,
  );
}
