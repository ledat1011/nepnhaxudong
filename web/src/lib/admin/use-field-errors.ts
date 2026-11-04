"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { withoutFields, type FieldErrors } from "./field-errors";

const NO_ERRORS: FieldErrors = {};

/** A wrong box (`aria-invalid`) or a control that stands for a wrong group, such as "Thêm đặc điểm". */
const TARGET_SELECTOR = '[aria-invalid="true"], [data-error-target]';

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

  useEffect(() => {
    const root = () => document.querySelector(`[data-error-root="${id}"]`);
    if (moves === 0 || focusFirstInvalid(root())) return;
    // A tab that was just chosen shows its panel one render later (Radix Presence), so look once more then.
    const retry = setTimeout(() => focusFirstInvalid(root()), 0);
    return () => clearTimeout(retry);
  }, [moves, id]);

  const show = useCallback((next: FieldErrors) => {
    setErrors(next);
    if (Object.keys(next).length > 0) setMoves((count) => count + 1);
  }, []);

  /** Removes the errors of fields the user changed. See `withoutFields` for the keys. */
  const clear = useCallback((...keys: string[]) => setErrors((current) => withoutFields(current, keys)), []);

  const reset = useCallback(() => setErrors(NO_ERRORS), []);

  return { rootProps, errors, show, clear, reset, hasErrors: Object.keys(errors).length > 0 };
}
