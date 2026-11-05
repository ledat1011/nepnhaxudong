"use client";

import { Mic } from "lucide-react";
import { useEffect, useId, useSyncExternalStore } from "react";
import { Button } from "@/components/admin/ui/button";
import { useTouchScreen } from "@/lib/admin/use-touch-screen";

/** Remembers on this device that the user has read the hint. */
export const MIC_HINT_KEY = "nepnha-admin-goi-y-micro";
const DISMISSED = "da-hieu";

/**
 * Which hints are on the screen, in the order they appeared, and whether the user has read the hint.
 * Only the first one shows, so a form with several long boxes shows it once.
 */
const store = {
  mounted: [] as string[],
  dismissed: null as boolean | null,
  listeners: new Set<() => void>(),
};

function changed() {
  store.listeners.forEach((listener) => listener());
}

function dismissedOnThisDevice(): boolean {
  if (store.dismissed === null) {
    try {
      store.dismissed = window.localStorage.getItem(MIC_HINT_KEY) === DISMISSED;
    } catch {
      // Storage blocked (private mode): show the hint until the user closes it on this page.
      store.dismissed = false;
    }
  }
  return store.dismissed;
}

function subscribe(listener: () => void) {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

function dismiss() {
  store.dismissed = true;
  try {
    window.localStorage.setItem(MIC_HINT_KEY, DISMISSED);
  } catch {
    // Not remembered after a reload, but closed for now.
  }
  changed();
}

/** For tests: forget the state kept between renders, as a new page load would. */
export function resetMicHintForTest() {
  store.mounted = [];
  store.dismissed = null;
}

/**
 * A short tip next to a long text box: the phone keyboard has a microphone that types what the user says, in
 * Vietnamese. Typing a long text with one finger is slow for older users; most do not know about the microphone.
 * Shown on touch screens only, once per screen, until the user taps "Đã hiểu".
 */
export function MicHint() {
  const id = useId();
  const touch = useTouchScreen();

  useEffect(() => {
    store.mounted.push(id);
    changed();
    return () => {
      store.mounted = store.mounted.filter((other) => other !== id);
      changed();
    };
  }, [id]);

  const shown = useSyncExternalStore(
    subscribe,
    () => store.mounted[0] === id && !dismissedOnThisDevice(),
    () => false,
  );

  if (!touch || !shown) return null;
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted p-3 text-sm sm:flex-row sm:items-center">
      <p className="flex flex-1 items-start gap-2">
        <Mic aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>Mẹo: chạm hình micro trên bàn phím rồi nói, máy sẽ gõ chữ giúp bạn.</span>
      </p>
      <Button type="button" variant="outline" className="self-start sm:self-auto" onClick={dismiss}>
        Đã hiểu
      </Button>
    </div>
  );
}
