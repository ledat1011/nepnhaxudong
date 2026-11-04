"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { zaloHref, zaloNumber } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { leaveTo } from "@/lib/navigation";
import type { ZaloPanelLayout, ZaloPanelProps } from "./ZaloPanel";

/** Narrow screens (below the `md` breakpoint) get the bottom sheet layout. */
export const NARROW_QUERY = "(max-width: 767px)";
/**
 * Touch screens get no QR code (a phone cannot scan its own screen) and open Zalo in the same
 * tab, so the zalo.me link can hand the chat to the Zalo app. A mouse user keeps the QR code
 * and a new tab, so a desktop visitor is never taken off the site.
 */
export const TOUCH_QUERY = "(pointer: coarse)";

type ZaloLinkProps = {
  /** The Zalo setting from the admin: a number, or a zalo.me link. */
  zalo: string;
  labels: Dictionary["zalo"];
  className?: string;
  children: ReactNode;
};

// The panel (Radix dialog) and the QR code library load on the first hover, focus or click,
// so they add nothing to the first page load.
const loadPanel = () => import("./ZaloPanel").then((module) => module.ZaloPanel);

const noSubscription = () => () => {};

function isPlainClick(event: MouseEvent) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * A link to the Zalo chat. Without JavaScript it is a plain link to zalo.me. With JavaScript a
 * plain click opens the Zalo panel instead (see `ZaloPanel`). A click with a modifier key or
 * the middle button keeps the browser's own behavior (for example a new tab).
 */
export function ZaloLink({ zalo, labels, className, children }: ZaloLinkProps) {
  const href = zaloHref(zalo);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [Panel, setPanel] = useState<ComponentType<ZaloPanelProps> | null>(null);
  const [layout, setLayout] = useState<ZaloPanelLayout>("dialog");
  const [touch, setTouch] = useState(false);
  const [open, setOpen] = useState(false);
  // From the click until the panel opens: on a slow phone the panel code may take a moment.
  const [loading, setLoading] = useState(false);
  // The link only opens a dialog once the page runs JavaScript.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );

  function preload() {
    loadPanel().catch(() => {});
  }

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    // The second click of a double click: the first one already opens the panel.
    if (event.detail > 1) return;
    const nextLayout = window.matchMedia(NARROW_QUERY).matches ? "sheet" : "dialog";
    const nextTouch = window.matchMedia(TOUCH_QUERY).matches;
    setLoading(true);
    loadPanel().then(
      (component) => {
        setPanel(() => component);
        setLayout(nextLayout);
        setTouch(nextTouch);
        setOpen(true);
        setLoading(false);
      },
      // The panel could not load (for example offline): go to zalo.me as the link would.
      () => {
        setLoading(false);
        leaveTo(href);
      },
    );
  }

  return (
    <>
      <a
        ref={triggerRef}
        href={href}
        onClick={onClick}
        onPointerEnter={preload}
        onFocus={preload}
        aria-haspopup={hydrated ? "dialog" : undefined}
        aria-busy={loading || undefined}
        className={loading ? `${className ?? ""} cursor-wait` : className}
      >
        {children}
      </a>
      {Panel !== null && (
        <Panel
          layout={layout}
          touch={touch}
          open={open}
          onOpenChange={setOpen}
          href={href}
          number={zaloNumber(zalo)}
          displayNumber={zalo}
          labels={labels}
          returnFocusTo={triggerRef}
        />
      )}
    </>
  );
}
