"use client";

import { useSyncExternalStore } from "react";

/** A finger is the main pointer: a phone or a tablet. */
const TOUCH_QUERY = "(pointer: coarse)";

function canMatch(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(onChange: () => void): () => void {
  if (!canMatch()) return () => undefined;
  const list = window.matchMedia(TOUCH_QUERY);
  list.addEventListener?.("change", onChange);
  return () => list.removeEventListener?.("change", onChange);
}

function snapshot(): boolean {
  return canMatch() && window.matchMedia(TOUCH_QUERY).matches;
}

/**
 * True on a phone or a tablet. There, a QR code on the screen cannot be scanned by the same device,
 * but an `otpauth://` link can open the authenticator app. False on the server and without matchMedia.
 */
export function useTouchScreen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
