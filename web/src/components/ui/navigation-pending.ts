/**
 * Shared state "a page navigation has waited longer than the delay". Every
 * `LinkPendingStatus` reports here after its delay, and the one `NavigationProgress` bar
 * reads it, so the bar and the text note start and stop at the same moment.
 */
let waiting = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Marks one waiting navigation. Returns the function that ends it; calling it twice is safe. */
export function markNavigationPending(): () => void {
  waiting += 1;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    waiting -= 1;
    notify();
  };
}

export function isNavigationPending(): boolean {
  return waiting > 0;
}

export function subscribeNavigationPending(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
