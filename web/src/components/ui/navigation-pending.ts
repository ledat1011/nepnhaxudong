/**
 * Shared state "a page navigation has waited longer than the delay". Every
 * `LinkPendingStatus` reports here after its delay, with its loading text. The one
 * `NavigationProgress` bar and the one `NavigationStatus` region read it, so the bar and the
 * text note start and stop at the same moment.
 */
const waiting: Array<{ label: string | null }> = [];
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Marks one waiting navigation. Returns the function that ends it; calling it twice is safe. */
export function markNavigationPending(label: string | null = null): () => void {
  const entry = { label };
  waiting.push(entry);
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    waiting.splice(waiting.indexOf(entry), 1);
    notify();
  };
}

export function isNavigationPending(): boolean {
  return waiting.length > 0;
}

/** The loading text of the latest waiting link, or null when none waits or it has no text. */
export function pendingLabel(): string | null {
  return waiting.at(-1)?.label ?? null;
}

export function subscribeNavigationPending(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
