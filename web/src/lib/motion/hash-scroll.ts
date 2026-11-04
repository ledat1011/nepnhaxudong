import { pendingHashScroll } from "./reveal";

/** The scroll counts as finished when no scroll event came for this long. */
const QUIET_MS = 150;
/** The longest wait: after this the scroll is treated as finished. */
const MAX_WAIT_MS = 2500;
/** A smooth scroll can stop a fraction of a pixel before its target. */
const LANDED_PX = 1;

/**
 * Calls `callback` when the page has stopped scrolling to the `#hash` target. Calls it at
 * once when no such scroll is pending. Returns a function that cancels the wait.
 */
export function whenHashScrollDone(root: Document, callback: () => void): () => void {
  if (pendingHashScroll(root) < LANDED_PX) {
    callback();
    return () => {};
  }
  let quietTimer: number | undefined;
  const finish = () => {
    cleanup();
    callback();
  };
  const restartQuietTimer = () => {
    window.clearTimeout(quietTimer);
    quietTimer = window.setTimeout(finish, QUIET_MS);
  };
  const maxTimer = window.setTimeout(finish, MAX_WAIT_MS);
  const cleanup = () => {
    window.clearTimeout(quietTimer);
    window.clearTimeout(maxTimer);
    window.removeEventListener("scroll", restartQuietTimer);
    window.removeEventListener("scrollend", finish);
  };
  window.addEventListener("scroll", restartQuietTimer, { passive: true });
  window.addEventListener("scrollend", finish);
  // A scroll that does not move any more sends no scroll event at all.
  restartQuietTimer();
  return cleanup;
}
