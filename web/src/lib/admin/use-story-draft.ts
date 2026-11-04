"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { clearDraft, draftKey, readDraft, writeDraft, type StoryDraft } from "./story-draft";

/** At most one write per second while the user types. */
export const DRAFT_THROTTLE_MS = 1000;

type Options<T> = {
  /** The story id, or undefined for a new story. */
  storyId: number | undefined;
  /** The signed-in user. Without one nothing is read or written. */
  userId: number | null;
  /** The form now. */
  state: T;
  /**
   * The saved story as the API sent it, before the editor rewrote the body in its own form. Both the stored
   * draft and the check on opening use this raw form, so "saved again since" is not set by the editor alone.
   */
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
 * - "later": the question was closed with Escape. The old draft stays until the user changes the form; the
 *   first change replaces it, and from then on it works like "active".
 * - "off": nobody is signed in.
 */
type Phase = "reading" | "asking" | "active" | "later" | "off";

/** Keeps the story being written in the browser and offers it back when the editor opens again. */
export function useStoryDraft<T>({ storyId, userId, state, base, dirty, enabled, isState }: Options<T>) {
  const key = userId === null ? null : draftKey(userId, storyId);
  const [phase, setPhase] = useState<Phase>("reading");
  const [offer, setOffer] = useState<DraftOffer<T> | null>(null);
  // The storage refused a write (full, or blocked by the browser). Autosave stops for this editor.
  const [failed, setFailed] = useState(false);
  // Bumped by clear(), so the write effect runs again: text typed during a save is then written at once.
  const [clears, setClears] = useState(0);
  const latest = useRef({ key, userId, state, base });
  useLayoutEffect(() => {
    latest.current = { key, userId, state, base };
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStateRef = useRef(isState);
  // For "later": the form when the question was closed, and whether the user has changed it since.
  const laterFrom = useRef<string | null>(null);
  const laterEdited = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const flush = useCallback(() => {
    cancel();
    const { key: target, userId: owner, state: now, base: from } = latest.current;
    if (target === null || owner === null) return;
    const draft: StoryDraft<T> = { version: 1, userId: owner, savedAt: Date.now(), base: from, state: now };
    // "blocked" is a sign-out (here or in another tab): not an error of this phone.
    if (writeDraft(target, draft) === "failed") setFailed(true);
  }, [cancel]);

  useEffect(() => {
    if (key === null || userId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no user: the draft stays off
      setPhase("off");
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
    if (key === null || !enabled || failed || (phase !== "active" && phase !== "later")) {
      cancel();
      return;
    }
    if (phase === "later" && !laterEdited.current) {
      // The old draft is kept until the user really changes the form (the editor may rewrite the body alone).
      if (!dirty || JSON.stringify(state) === laterFrom.current) return;
      laterEdited.current = true;
    }
    if (!dirty) {
      cancel();
      clearDraft(key);
      return;
    }
    if (timer.current === null) timer.current = setTimeout(flush, DRAFT_THROTTLE_MS);
  }, [state, dirty, phase, enabled, failed, key, clears, cancel, flush]);

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

  // Leaving the editor ("Rời trang", a link) writes the last second of typing too. After a sign-out the write is
  // refused by writeDraft, so a closing editor cannot bring a removed draft back.
  useEffect(
    () => () => {
      if (timer.current !== null) flush();
    },
    [flush],
  );

  return {
    offer: phase === "asking" ? offer : null,
    failed,
    /** True while what is typed is kept on this phone, so leaving the page loses nothing. */
    keeping: key !== null && !failed && (phase === "active" || phase === "later"),
    /** "Khôi phục": the caller puts the returned text into the form. The draft is written again from there. */
    restore(): T | null {
      setPhase("active");
      return offer?.draft.state ?? null;
    },
    /** "Bỏ bản đó". */
    discard() {
      if (key !== null) clearDraft(key);
      setPhase("active");
    },
    /** The question was closed without an answer (Escape). The draft stays until the user changes the form. */
    later() {
      laterFrom.current = JSON.stringify(latest.current.state);
      laterEdited.current = false;
      setPhase("later");
    },
    /** After a successful save or "Bỏ thay đổi". Text that is still unsaved is written again a moment later. */
    clear() {
      cancel();
      if (key !== null) clearDraft(key);
      setClears((count) => count + 1);
    },
  };
}
