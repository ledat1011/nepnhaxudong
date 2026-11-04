"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlaceholder } from "@/components/brand/ImagePlaceholder";
import type { ImageRef } from "@/lib/content/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** An image with a source the browser can load; the server builds `src` (see ProductSection). */
export type GalleryImage = Omit<ImageRef, "url"> & { src: string };

type GalleryProps = {
  images: GalleryImage[];
  dict: Dictionary;
};

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";
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

export function Gallery({ images, dict }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = images.length;

  const step = useCallback(
    (delta: number) => setIndex((current) => (current + delta + count) % count),
    [count],
  );

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      } else if (event.key === "ArrowLeft") {
        step(-1);
      } else if (event.key === "ArrowRight") {
        step(1);
      } else if (event.key === "Tab") {
        trapFocus(event);
      }
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

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open, step]);

  if (count === 0) {
    return (
      <ImagePlaceholder
        label={dict.image.placeholder}
        className="aspect-[4/3] w-full rounded-2xl"
      />
    );
  }

  const current = images[index];

  return (
    <div>
      <button
        type="button"
        aria-label={dict.gallery.viewLarge}
        onClick={(event) => {
          openerRef.current = event.currentTarget;
          setOpen(true);
        }}
        className={`block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-2xl bg-straw ${FOCUS_CLASS}`}
      >
        <Image
          src={current.src}
          alt={current.alt}
          width={current.width}
          height={current.height}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="h-full w-full object-cover"
        />
      </button>

      {count > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto p-1">
          {images.map((image, i) => (
            <li key={image.src} className="shrink-0">
              <button
                type="button"
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className={`block aspect-[4/3] w-20 overflow-hidden rounded-lg bg-straw ${FOCUS_CLASS} ${
                  i === index ? "ring-2 ring-coat ring-offset-2 ring-offset-rice" : "opacity-80 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="80px"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={dict.gallery.viewLarge}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
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
            onClick={() => setOpen(false)}
            className={`absolute right-4 top-4 ${DIALOG_BUTTON_CLASS}`}
          >
            <CloseIcon />
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                aria-label={dict.gallery.previous}
                onClick={() => step(-1)}
                className={`absolute left-2 top-1/2 -translate-y-1/2 md:left-6 ${DIALOG_BUTTON_CLASS}`}
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                aria-label={dict.gallery.next}
                onClick={() => step(1)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 md:right-6 ${DIALOG_BUTTON_CLASS}`}
              >
                <Chevron direction="right" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
