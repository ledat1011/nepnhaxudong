/**
 * Calls `callback` when the browser is idle, at the latest after `timeoutMs`. Where
 * `requestIdleCallback` is missing (Safari), it waits `fallbackMs` instead. Returns a function
 * that cancels the wait.
 */
export function whenIdle(callback: () => void, timeoutMs: number, fallbackMs: number): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(() => callback(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, fallbackMs);
  return () => window.clearTimeout(id);
}
