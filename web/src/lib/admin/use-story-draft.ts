"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clearDraft, readDraft, writeDraft, type StoryDraft } from "./story-draft";

/** At most one write per second while the user types. */
export const DRAFT_THROTTLE_MS = 1000;

type Options<T> = {
  key: string;
  /** The signed-in user. Without one nothing is read or written. */
  userId: number | null;
  /** The form now. */
  state: T;
  /** The saved version the form started from. */
  base: T;
  dirty: boolean;
  /** False while the page is leaving (for example after a create). */
  enabled: boolean;
  isState(value: unknown): value is T;
};

export type DraftOffer<T> = {
  draft: StoryDraft<T>;
  /** The saved story changed after the draft was written (another device, or another person). */
  stale: boolean;
};

/**
 * - "reading": the browser storage is read once after the first render (it does not exist on the server).
 * - "asking": a draft that differs from the form waits for the user's answer; nothing is written meanwhile.
 * - "active": a changed form is written at most once per second; a clean form removes the draft.
 * - "paused": the user put the question aside, or nobody is signed in. Nothing is written or removed.
 */
type Phase = "reading" | "asking" | "active" | "paused";

/** Keeps the story being written in the browser and offers it back when the editor opens again. */
export function useStoryDraft<T>({ key, userId, state, base, dirty, enabled, isState }: Options<T>) {
  const [phase, setPhase] = useState<Phase>("reading");
  const [offer, setOffer] = useState<DraftOffer<T> | null>(null);
  // The storage refused a write (full, or blocked by the browser). Autosave stops for this editor.
  const [failed, setFailed] = useState(false);
  const latest = useRef({ key, userId, state, base });
  useLayoutEffect(() => {
    latest.current = { key, userId, state, base };
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStateRef = useRef(isState);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const flush = useCallback(() => {
    cancel();
    const { key: target, userId: owner, state: now, base: from } = latest.current;
    if (owner === null) return;
    const draft: StoryDraft<T> = { version: 1, userId: owner, savedAt: Date.now(), base: from, state: now };
    if (!writeDraft(target, draft)) setFailed(true);
  }, [cancel]);

  useEffect(() => {
    if (userId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no user: the draft stays off
      setPhase("paused");
      return;
    }
    const draft = readDraft(key, userId, isStateRef.current);
    const now = JSON.stringify(latest.current.state);
    if (draft === null || JSON.stringify(draft.state) === now) {
      if (draft !== null) clearDraft(key);
      setPhase("active");
      return;
    }
    setOffer({ draft, stale: JSON.stringify(draft.base) !== JSON.stringify(latest.current.base) });
    setPhase("asking");
  }, [key, userId]);

  useEffect(() => {
    if (phase !== "active" || !enabled || failed) {
      cancel();
      return;
    }
    if (!dirty) {
      cancel();
      clearDraft(key);
      return;
    }
    if (timer.current === null) timer.current = setTimeout(flush, DRAFT_THROTTLE_MS);
  }, [state, dirty, phase, enabled, failed, key, cancel, flush]);

  // A phone may close the tab or lock the screen at any time: write what is waiting at once.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden" && timer.current !== null) flush();
    }
    function onPageHide() {
      if (timer.current !== null) flush();
    }
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flush]);

  // No write after the editor closed: a sign-out may have just removed every draft.
  useEffect(() => cancel, [cancel]);

  return {
    offer: phase === "asking" ? offer : null,
    failed,
    /** "Khôi phục": the caller puts the returned text into the form. The draft is written again from there. */
    restore(): T | null {
      setPhase("active");
      return offer?.draft.state ?? null;
    },
    /** "Bỏ bản đó". */
    discard() {
      clearDraft(key);
      setPhase("active");
    },
    /** The question was closed without an answer (Escape). The draft stays for the next time. */
    later() {
      setPhase("paused");
    },
    /** After a successful save or "Bỏ thay đổi". */
    clear() {
      cancel();
      clearDraft(key);
    },
  };
}
