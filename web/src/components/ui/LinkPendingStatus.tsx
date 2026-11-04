"use client";

import { useLinkStatus } from "next/link";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// A fixed box, so showing it moves nothing on the page. No animation: it appears at once.
const VISIBLE_CLASS =
  "fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-full border-2 border-coat bg-straw px-5 py-2 font-bold text-earth";

const noSubscription = () => () => {};

/**
 * Loading state of a link to a page that is rendered on request (the story list and the story
 * pages). Put it inside a next/link `Link`: while the next page is still loading, it shows the
 * label. The status region is always present (empty when idle), so screen readers announce
 * the text. It is rendered into the body, outside the link and its moving ancestors.
 */
export function LinkPendingStatus({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  // The body exists only in the browser: render nothing on the server and in hydration.
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  if (!inBrowser) return null;
  return createPortal(
    <p role="status" className={pending ? VISIBLE_CLASS : "sr-only"}>
      {pending ? label : ""}
    </p>,
    document.body,
  );
}
