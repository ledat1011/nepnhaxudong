/** Without a scroll event for this long, a page that did not start scrolling counts as still. */
const QUIET_MS = 150;
/** The longest wait: after this the scroll is treated as finished. */
const MAX_WAIT_MS = 2500;

/**
 * Calls `callback` when the page is not scrolling: no scroll event for the quiet time, or the
 * end of a running scroll (a `#hash` jump, a smooth scroll, a touch fling). Returns a function
 * that cancels the wait.
 */
export function whenScrollingStops(callback: () => void): () => void {
  // The browser reports the end of a scroll itself. A quiet time alone is a guess: a busy page
  // can send no scroll event for a few hundred ms in the middle of a smooth scroll.
  const hasScrollEnd = "onscrollend" in window;
  let quietTimer: number | undefined;
  const finish = () => {
    cleanup();
    callback();
  };
  const restartQuietTimer = () => {
    window.clearTimeout(quietTimer);
    quietTimer = window.setTimeout(finish, QUIET_MS);
  };
  const onScroll = () => {
    if (hasScrollEnd) {
      window.clearTimeout(quietTimer);
    } else {
      restartQuietTimer();
    }
  };
  const maxTimer = window.setTimeout(finish, MAX_WAIT_MS);
  const cleanup = () => {
    window.clearTimeout(quietTimer);
    window.clearTimeout(maxTimer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", finish);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", finish);
  // A page that does not move sends no scroll event at all.
  restartQuietTimer();
  return cleanup;
}
