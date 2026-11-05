"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

type MobileMenuProps = {
  label: string;
  closeLabel: string;
  children: ReactNode;
};

/**
 * Menu button and dropdown panel for small screens. The panel is absolutely
 * positioned under the header, so opening it does not move the page content.
 */
export function MobileMenu({ label, closeLabel, children }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    // A tap outside the button and the panel closes the menu, as people expect on a phone.
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function closeOnLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a")) {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : label}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-earth hover:bg-straw focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
      >
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          aria-hidden="true"
          focusable="false"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          {open ? (
            <path d="M5 5l14 14M19 5L5 19" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      <div
        id={panelId}
        hidden={!open}
        onClick={closeOnLinkClick}
        className="absolute inset-x-0 top-full border-b border-straw bg-rice px-4 py-3 shadow-lg"
      >
        {children}
      </div>
    </div>
  );
}
