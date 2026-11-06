"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ImageRef } from "@/lib/content/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/**
 * An image with a source the browser can load. The server builds `src` with `toImageSrc`,
 * because the browser cannot read SITE_URL.
 */
export type LightboxImage = Omit<ImageRef, "url"> & { src: string };

type LightboxProps = {
  images: LightboxImage[];
  /** The image shown; null keeps the lightbox closed. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  dict: Dictionary;
};

const DIALOG_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-full bg-rice text-earth hover:bg-straw focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rice";
const FOCUSABLE = "button, [href], [tabindex]:not([tabindex='-1'])";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * A modal dialog that shows one image whole, with previous and next buttons when there are
 * several. Esc, the close button and a click on the backdrop close it; Tab stays inside it;
 * on close, focus goes back to the element that had it when the lightbox opened.
 *
 * The opener should be focused when it opens the lightbox. A button gets focus on click in
 * every browser except Safari, so callers focus it in their click handler.
 */
export function Lightbox({ images, index, onClose, onIndexChange, dict }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null;
  const count = images.length;

  // The key handler is added once per opening, so it reads the current props from here.
  const latest = useRef({ index, count, onClose, onIndexChange });
  useEffect(() => {
    latest.current = { index, count, onClose, onIndexChange };
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function step(delta: number) {
      const { index: current, count: total, onIndexChange: change } = latest.current;
      if (current === null || total < 2) return;
      change((current + delta + total) % total);
    }

    function trapFocus(event: KeyboardEvent) {
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        latest.current.onClose();
      } else if (event.key === "ArrowLeft") {
        step(-1);
      } else if (event.key === "ArrowRight") {
        step(1);
      } else if (event.key === "Tab") {
        trapFocus(event);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open]);

  if (index === null || !images[index]) return null;
  const current = images[index];

  // Rendered at the end of the body: a parent with a transform (the journey motion moves each
  // milestone) would otherwise become the box that `fixed` is measured from.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={dict.gallery.viewLarge}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-earth/90 p-4"
    >
      <Image
        src={current.src}
        alt={current.alt}
        width={current.width}
        height={current.height}
        sizes="100vw"
        className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain"
      />
      <button
        ref={closeRef}
        type="button"
        aria-label={dict.gallery.close}
        onClick={onClose}
        className={`absolute right-4 top-4 ${DIALOG_BUTTON_CLASS}`}
      >
        <CloseIcon />
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label={dict.gallery.previous}
            onClick={() => onIndexChange((index - 1 + count) % count)}
            className={`absolute left-2 top-1/2 -translate-y-1/2 md:left-6 ${DIALOG_BUTTON_CLASS}`}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            aria-label={dict.gallery.next}
            onClick={() => onIndexChange((index + 1) % count)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 md:right-6 ${DIALOG_BUTTON_CLASS}`}
          >
            <Chevron direction="right" />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
