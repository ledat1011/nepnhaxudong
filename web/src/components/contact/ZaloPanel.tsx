"use client";

import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type ZaloPanelLayout = "dialog" | "sheet";

export type ZaloPanelProps = {
  /** Centered dialog on wide screens, bottom sheet on narrow ones. */
  layout: ZaloPanelLayout;
  /** A touch screen: no QR code, and Open Zalo in the same tab so the Zalo app takes over. */
  touch: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The zalo.me link of the chat. */
  href: string;
  /** Digits to copy, or null when the setting is a link with no number. */
  number: string | null;
  /** The number as the family typed it in the admin, for reading. */
  displayNumber: string;
  labels: Dictionary["zalo"];
  /** The link that opened the panel. Focus goes back to it on close. */
  returnFocusTo: RefObject<HTMLElement | null>;
};

const QR_SIZE_PX = 192;
const COPY_NOTE_MS = 3000;
/**
 * Right after the panel opens, a click outside does not close it. The second click of a double
 * click (common with older visitors) lands on the backdrop, and must not close the panel at once.
 */
const OUTSIDE_CLICK_GRACE_MS = 400;
// Earth on rice, the brand text pair: dark modules on a light ground, which every scanner reads.
const QR_COLORS = { dark: "#4a2c1aff", light: "#fbf7eeff" };

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";
const BUTTON_CLASS = `inline-flex min-h-11 items-center justify-center rounded-full px-6 py-2 font-bold underline-offset-4 hover:underline ${FOCUS_CLASS}`;
const PRIMARY_CLASS = `${BUTTON_CLASS} bg-coat text-rice hover:bg-earth`;
const SECONDARY_CLASS = `${BUTTON_CLASS} border-2 border-coat text-earth hover:bg-straw`;
// The panel sits above a dimmed page, so it is the one element with a shadow.
// overscroll-contain: scrolling to the end of the panel does not scroll the page behind it.
const PANEL_CLASS =
  "fixed z-50 overscroll-contain border-grain bg-rice text-earth shadow-xl focus:outline-none";
const DIALOG_CLASS = `${PANEL_CLASS} left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border-2 p-6 motion-safe:animate-dialog-in`;
const SHEET_CLASS = `${PANEL_CLASS} inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl border-x-2 border-t-2 px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] motion-safe:animate-sheet-in`;

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

type QrResult = { status: "ready"; src: string } | { status: "error" };

/** QR code of the chat link, made in the browser. The library loads only here. */
function ZaloQrCode({ href, labels }: { href: string; labels: Dictionary["zalo"] }) {
  const [result, setResult] = useState<QrResult | null>(null);

  useEffect(() => {
    let current = true;
    import("qrcode")
      .then(({ toString }) =>
        toString(href, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: QR_COLORS }),
      )
      .then(
        (svg) => {
          if (current) {
            setResult({
              status: "ready",
              src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
            });
          }
        },
        () => {
          if (current) setResult({ status: "error" });
        },
      );
    return () => {
      current = false;
    };
  }, [href]);

  // The box keeps the same size in every state, so the dialog does not change size.
  return (
    <div className="mx-auto mt-5 flex h-52 w-52 items-center justify-center rounded-xl border-2 border-straw bg-rice p-1 text-center">
      {result === null && <p className="text-sm font-medium">{labels.qrLoading}</p>}
      {result?.status === "error" && <p className="text-sm font-bold">{labels.qrError}</p>}
      {result?.status === "ready" && (
        // A data URL made in the browser: next/image has nothing to optimize here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={result.src}
          alt={labels.qrAlt}
          width={QR_SIZE_PX}
          height={QR_SIZE_PX}
          className="h-48 w-48"
        />
      )}
    </div>
  );
}

/**
 * Copies with the older `execCommand("copy")`, for pages served over plain http (for example
 * on the home network), where the clipboard API does not exist. The temporary field goes inside
 * the panel: the focus trap would pull focus back from a field in the body.
 */
function copyWithCommand(text: string, container: HTMLElement): boolean {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  // 16 px, so iOS does not zoom in on focus. Fixed and transparent, so nothing moves.
  Object.assign(field.style, { position: "fixed", top: "0", left: "0", opacity: "0", fontSize: "16px" });
  container.append(field);
  try {
    field.focus();
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    previous?.focus();
  }
}

type CopyState = "idle" | "copied" | "failed";

function useCopyNumber(number: string | null, container: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | undefined>(undefined);
  const frame = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (frame.current !== undefined) window.cancelAnimationFrame(frame.current);
    },
    [],
  );

  async function copy() {
    if (number === null) return;
    window.clearTimeout(timer.current);
    // Empty the status first and write the result on the next frame, so a screen reader
    // announces the same result again when the visitor copies twice.
    setState("idle");
    let copied: boolean;
    try {
      if (!navigator.clipboard) throw new Error("No clipboard API");
      await navigator.clipboard.writeText(number);
      copied = true;
    } catch {
      copied = container.current !== null && copyWithCommand(number, container.current);
    }
    frame.current = window.requestAnimationFrame(() => {
      setState(copied ? "copied" : "failed");
      // The note goes away by itself; the failure note stays, because it says what to do.
      if (copied) timer.current = window.setTimeout(() => setState("idle"), COPY_NOTE_MS);
    });
  }

  return { state, copy };
}

type BodyProps = Omit<ZaloPanelProps, "open" | "onOpenChange" | "returnFocusTo">;

/**
 * Everything inside the panel. Radix removes it when the panel closes, so a reopened panel
 * starts clean: no copy note from the last time.
 */
function ZaloPanelBody({ layout, touch, href, number, displayNumber, labels }: BodyProps) {
  const sheet = layout === "sheet";
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, copy } = useCopyNumber(number, containerRef);
  const sizeClass = sheet ? "min-h-12 w-full text-lg" : "";

  return (
    <div ref={containerRef}>
      <div className="flex items-start justify-between gap-3">
        <Dialog.Title className="pt-2 text-xl font-bold leading-snug">{labels.title}</Dialog.Title>
        <Dialog.Close
          aria-label={labels.close}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-earth hover:bg-straw ${FOCUS_CLASS}`}
        >
          <CloseIcon />
        </Dialog.Close>
      </div>
      <Dialog.Description className="mt-1 font-medium leading-relaxed">
        {touch ? labels.phoneHint : labels.scan}
      </Dialog.Description>

      {!touch && <ZaloQrCode href={href} labels={labels} />}

      {number !== null && (
        <p className={sheet ? "mt-5" : "mt-5 text-center"}>
          <span className="block text-sm font-bold text-coat">{labels.number}</span>
          <span className="text-2xl font-bold tabular-nums">{displayNumber}</span>
        </p>
      )}

      <div className={sheet ? "mt-6 flex flex-col gap-3" : "mt-6 flex flex-wrap justify-center gap-3"}>
        {touch ? (
          // Same tab: on a touch screen the zalo.me link hands the chat to the Zalo app.
          <a href={href} className={`${PRIMARY_CLASS} ${sizeClass}`}>
            {labels.open}
          </a>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${PRIMARY_CLASS} ${sizeClass}`}
          >
            {labels.open}
            <span className="sr-only"> {labels.newTab}</span>
          </a>
        )}
        {number !== null && (
          <button type="button" onClick={copy} className={`${SECONDARY_CLASS} ${sizeClass}`}>
            {labels.copy}
          </button>
        )}
      </div>

      {number !== null && (
        <p role="status" className={`mt-3 min-h-6 text-sm font-bold ${sheet ? "" : "text-center"}`}>
          {state === "copied" && labels.copied}
          {state === "failed" && labels.copyFailed}
        </p>
      )}
    </div>
  );
}

/**
 * The Zalo contact panel: a centered dialog on wide screens, a bottom sheet on narrow ones,
 * with a QR code unless the screen is a touch screen. Radix gives the focus trap, Escape, the
 * click outside and the scroll lock. Loaded on demand by `ZaloLink`.
 */
export function ZaloPanel({ open, onOpenChange, returnFocusTo, ...body }: ZaloPanelProps) {
  const openedAt = useRef(0);

  useEffect(() => {
    if (open) openedAt.current = Date.now();
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-zalo-overlay
          className="fixed inset-0 z-50 bg-earth/60 motion-safe:animate-overlay-in"
        />
        <Dialog.Content
          data-layout={body.layout}
          className={body.layout === "sheet" ? SHEET_CLASS : DIALOG_CLASS}
          onPointerDownOutside={(event) => {
            if (Date.now() - openedAt.current < OUTSIDE_CLICK_GRACE_MS) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusTo.current?.focus();
          }}
        >
          <ZaloPanelBody {...body} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
