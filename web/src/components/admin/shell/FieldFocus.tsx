"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { FIELD_PARAM, closedTab, fieldTarget, findField, type FieldTarget } from "@/lib/admin/field-targets";

/** How long a screen may take to load its data before the search for the field stops. */
const GIVE_UP_MS = 10_000;
/** A dialog that just opened moves the focus to its first box; the field is focused after that. */
const SETTLE_MS = 150;
/** How long the field keeps its extra ring, so the eye finds it (a button shows no focus ring after a tap). */
const MARK_MS = 4_000;

/**
 * Watches `root` until the field of `target` is on screen, then scrolls to it, focuses it and marks it.
 * Opens the target's tab first when needed (a Radix tab opens when it gets focus). Returns a stop function.
 */
export function focusWhenReady(root: HTMLElement, target: FieldTarget): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let done = false;
  const observer = new MutationObserver(() => attempt());

  function finish() {
    done = true;
    observer.disconnect();
  }

  function attempt() {
    if (done) return;
    const tab = closedTab(root, target);
    if (tab === "missing") return;
    if (tab !== null) {
      tab.focus();
      return;
    }
    const field = findField(root, target);
    if (field === null) return;
    finish();
    timers.push(
      setTimeout(() => {
        field.scrollIntoView?.({ block: "center" });
        field.focus({ preventScroll: true });
        field.setAttribute("data-field-target", "");
        const unmark = () => field.removeAttribute("data-field-target");
        field.addEventListener("blur", unmark, { once: true });
        timers.push(setTimeout(unmark, MARK_MS));
      }, SETTLE_MS),
    );
  }

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden", "aria-selected", "data-state"],
  });
  timers.push(setTimeout(finish, GIVE_UP_MS));
  attempt();
  return () => {
    finish();
    for (const timer of timers) clearTimeout(timer);
  };
}

/**
 * Opens the screen at one field when the link has `?o=<field>` (the to-do list of the dashboard uses it).
 * Mounted once in the admin shell, inside a Suspense boundary because it reads the search params.
 */
export function FieldFocus() {
  const params = useSearchParams();
  const pathname = usePathname();
  const key = params.get(FIELD_PARAM);

  useEffect(() => {
    const target = fieldTarget(key);
    if (target === null) return;
    return focusWhenReady(document.body, target);
  }, [key, pathname]);

  return null;
}
