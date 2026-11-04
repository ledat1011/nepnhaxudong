"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { mapApiDetail, withoutFields, type FieldErrors, type FieldRule } from "./field-errors";

const NO_ERRORS: FieldErrors = {};

/** A wrong box (`aria-invalid`) or a control that stands for a wrong group, such as "Thêm đặc điểm". */
const TARGET_SELECTOR = '[aria-invalid="true"], [data-error-target]';

/** An answer later than this may find the user already typing elsewhere. */
const SLOW_ANSWER_MS = 1000;

/** True when the cursor is in a text box (or the story editor) inside `root`. */
function typingIn(root: Element | null): boolean {
  const active = document.activeElement;
  return (
    root !== null &&
    active instanceof HTMLElement &&
    root.contains(active) &&
    (active.matches("input, textarea") || active.isContentEditable)
  );
}

/**
 * Scrolls to the first wrong field inside `root`, in page order, and puts the cursor in it.
 * "center" keeps the field clear of the save bar and the bottom menu, which are fixed at the bottom.
 */
export function focusFirstInvalid(root: ParentNode | null): boolean {
  const target = (root ?? document).querySelector<HTMLElement>(TARGET_SELECTOR);
  if (target === null) return false;
  target.scrollIntoView?.({ block: "center" });
  target.focus({ preventScroll: true });
  return true;
}

/**
 * The errors shown under the fields of one form. `show` replaces them and, when there is one, moves to the
 * first wrong field after the next render (so a field that a tab change shows first can be found).
 * Spread `rootProps` on the element that holds the fields. (A data attribute, not a ref: the form reads
 * `errors` while it renders, and a ref in the same object would make that a ref read for the React linter.)
 */
export function useFieldErrors() {
  const id = useId();
  const rootProps = { "data-error-root": id };
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);
  // Counts the requests to move, so the same errors shown twice still move the cursor twice.
  const [moves, setMoves] = useState(0);
  // The keys of errors that have no error text on screen (their box is hidden). The form lists them instead.
  const [unshownKeys, setUnshownKeys] = useState<readonly string[]>([]);
  // When the last save started (reset() is called then), and whether the next move may be skipped while typing.
  const savedAt = useRef(0);
  const fromServer = useRef(false);

  // Runs before the effect below in the same commit, so the check there sees the errors of this render.
  const latestErrors = useRef(errors);
  useEffect(() => {
    latestErrors.current = errors;
  });

  useEffect(() => {
    if (moves === 0) return;
    const root = () => document.querySelector(`[data-error-root="${id}"]`);
    const skip = fromServer.current && Date.now() - savedAt.current > SLOW_ANSWER_MS && typingIn(root());
    function check() {
      const container = root();
      if (container === null) return;
      const shown = new Set([...container.querySelectorAll("[data-field-error]")].map((node) => node.textContent));
      setUnshownKeys(Object.keys(latestErrors.current).filter((key) => !shown.has(latestErrors.current[key])));
    }
    if (skip || focusFirstInvalid(root())) {
      const later = setTimeout(check, 0);
      return () => clearTimeout(later);
    }
    // A tab that was just chosen shows its panel one render later (Radix Presence), so look once more then.
    const retry = setTimeout(() => {
      focusFirstInvalid(root());
      check();
    }, 0);
    return () => clearTimeout(retry);
  }, [moves, id]);

  const show = useCallback((next: FieldErrors) => {
    fromServer.current = false;
    setErrors(next);
    setUnshownKeys([]);
    if (Object.keys(next).length > 0) setMoves((count) => count + 1);
  }, []);

  /**
   * The errors of a failed save, from the API message. The cursor moves to the first one, unless the answer
   * was slow and the user is already typing in another box of this form: then only the errors are shown.
   */
  const showApi = useCallback((detail: string, rules: readonly FieldRule[]) => {
    const { errors: next } = mapApiDetail(detail, rules);
    fromServer.current = true;
    setErrors(next);
    setUnshownKeys([]);
    if (Object.keys(next).length > 0) setMoves((count) => count + 1);
  }, []);

  /** Removes the errors of fields the user changed. See `withoutFields` for the keys. */
  const clear = useCallback((...keys: string[]) => setErrors((current) => withoutFields(current, keys)), []);

  /** Call it when a save starts: removes the errors and notes the time. */
  const reset = useCallback(() => {
    savedAt.current = Date.now();
    setErrors(NO_ERRORS);
    setUnshownKeys([]);
  }, []);

  return {
    rootProps,
    errors,
    show,
    showApi,
    clear,
    reset,
    /** True while an error is shown under a box (an error without a box is in `unshown`). */
    hasErrors: Object.keys(errors).length > unshownKeys.filter((key) => errors[key] !== undefined).length,
    /** The error texts whose box is not on screen. */
    unshown: unshownKeys.filter((key) => errors[key] !== undefined).map((key) => errors[key]),
  };
}
