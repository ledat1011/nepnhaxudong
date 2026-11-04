"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withoutFields, type FieldErrors } from "./field-errors";

const NO_ERRORS: FieldErrors = {};

/** A wrong box (`aria-invalid`) or a control that stands for a wrong group, such as "Thêm đặc điểm". */
const TARGET_SELECTOR = '[aria-invalid="true"], [data-error-target]';

/**
 * Scrolls to the first wrong field inside `root`, in page order, and puts the cursor in it.
 * "center" keeps the field clear of the save bar and the bottom menu, which are fixed at the bottom.
 */
export function focusFirstInvalid(root: ParentNode | null): void {
  const target = (root ?? document).querySelector<HTMLElement>(TARGET_SELECTOR);
  if (target === null) return;
  target.scrollIntoView?.({ block: "center" });
  target.focus({ preventScroll: true });
}

/**
 * The errors shown under the fields of one form. `show` replaces them and, when there is one, moves to the
 * first wrong field after the next render (so a field that a tab change shows first can be found).
 * Put `root` on the element that holds the fields.
 */
export function useFieldErrors() {
  const rootElement = useRef<HTMLElement | null>(null);
  // A callback ref fits any element type (a fieldset, a div, a form).
  const root = useCallback((node: HTMLElement | null) => {
    rootElement.current = node;
  }, []);
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);
  // Counts the requests to move, so the same errors shown twice still move the cursor twice.
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (moves > 0) focusFirstInvalid(rootElement.current);
  }, [moves]);

  const show = useCallback((next: FieldErrors) => {
    setErrors(next);
    if (Object.keys(next).length > 0) setMoves((count) => count + 1);
  }, []);

  /** Removes the errors of fields the user changed. See `withoutFields` for the keys. */
  const clear = useCallback((...keys: string[]) => setErrors((current) => withoutFields(current, keys)), []);

  const reset = useCallback(() => setErrors(NO_ERRORS), []);

  return { root, errors, show, clear, reset, hasErrors: Object.keys(errors).length > 0 };
}
