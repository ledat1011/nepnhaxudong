"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { zaloHref, zaloNumber } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ZaloPanelMode, ZaloPanelProps } from "./ZaloPanel";

/**
 * Screens that get the bottom sheet: narrow screens (below the `md` breakpoint) and touch
 * screens. A phone cannot scan a QR code on its own screen, so the sheet has no QR code.
 */
export const SHEET_MEDIA_QUERY = "(max-width: 767px), (pointer: coarse)";

type ZaloLinkProps = {
  /** The Zalo setting from the admin: a number, or a full URL in older settings. */
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
 * plain click opens a dialog with a QR code (wide screens) or a bottom sheet (phones) instead.
 * A click with a modifier key keeps the browser's own behavior (for example a new tab).
 */
export function ZaloLink({ zalo, labels, className, children }: ZaloLinkProps) {
  const href = zaloHref(zalo);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [Panel, setPanel] = useState<ComponentType<ZaloPanelProps> | null>(null);
  const [mode, setMode] = useState<ZaloPanelMode>("dialog");
  const [open, setOpen] = useState(false);
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
    const nextMode = window.matchMedia(SHEET_MEDIA_QUERY).matches ? "sheet" : "dialog";
    loadPanel().then(
      (component) => {
        setPanel(() => component);
        setMode(nextMode);
        setOpen(true);
      },
      // The panel could not load (for example offline): go to zalo.me as the link would.
      () => window.location.assign(href),
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
        className={className}
      >
        {children}
      </a>
      {Panel !== null && (
        <Panel
          mode={mode}
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
