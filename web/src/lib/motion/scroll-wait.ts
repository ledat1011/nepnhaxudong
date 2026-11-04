/** Without a scroll event for this long, a page that did not start scrolling counts as still. */
const QUIET_MS = 150;
/**
 * The longest wait, counted from the call: after this the scroll is treated as finished. A scroll
 * found later in the wait does not restart it, so the wait always ends.
 */
const MAX_WAIT_MS = 2500;
/**
 * Rendering updates to watch after the wait ends. A smooth scroll (`scrollIntoView`, an in-page
 * link) moves the page and sends its first scroll event only in the second rendering update after
 * it starts. The scroll event of an update is sent before the frame callbacks of that update.
 */
const CONFIRM_FRAMES = 2;
/** User input that can start a scroll one or more frames later. */
const INPUT_EVENTS = ["pointerdown", "click", "keydown", "wheel", "touchstart"] as const;

/**
 * Calls `callback` when the page is not scrolling: no scroll event and no user input for the
 * quiet time, or the end of a running scroll (a `#hash` jump, a smooth scroll, a touch fling),
 * and then no scroll in the next rendering updates. Returns a function that cancels the wait.
 */
export function whenScrollingStops(callback: () => void): () => void {
  // The browser reports the end of a scroll itself. A quiet time alone is a guess: a busy page
  // can send no scroll event for a few hundred ms in the middle of a smooth scroll.
  const hasScrollEnd = "onscrollend" in window;
  let scrolling = false;
  let quietTimer: number | undefined;
  let frame: number | undefined;
  let framesLeft = 0;
  let confirmedY = 0;

  const finish = () => {
    cleanup();
    callback();
  };
  const stopConfirming = () => {
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
  };
  const restartQuietTimer = () => {
    stopConfirming();
    window.clearTimeout(quietTimer);
    quietTimer = window.setTimeout(confirm, QUIET_MS);
  };
  // A scroll can start in the same task as the end of the wait (a click on an in-page link) and
  // show only two rendering updates later. `ScrollTrigger.refresh()` would stop it.
  const confirm = () => {
    scrolling = false;
    window.clearTimeout(quietTimer);
    if (frame !== undefined) return;
    framesLeft = CONFIRM_FRAMES;
    confirmedY = window.scrollY;
    frame = window.requestAnimationFrame(checkFrame);
  };
  const checkFrame = () => {
    frame = undefined;
    if (window.scrollY !== confirmedY) {
      restartQuietTimer();
    } else if (--framesLeft > 0) {
      frame = window.requestAnimationFrame(checkFrame);
    } else {
      finish();
    }
  };
  const onScroll = () => {
    if (hasScrollEnd) {
      stopConfirming();
      window.clearTimeout(quietTimer);
      scrolling = true;
    } else {
      restartQuietTimer();
    }
  };
  // While a scroll runs, its own end is awaited; input does not shorten or lengthen that.
  const onInput = () => {
    if (!scrolling) restartQuietTimer();
  };
  const maxTimer = window.setTimeout(finish, MAX_WAIT_MS);
  const cleanup = () => {
    stopConfirming();
    window.clearTimeout(quietTimer);
    window.clearTimeout(maxTimer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", confirm);
    INPUT_EVENTS.forEach((type) => window.removeEventListener(type, onInput, true));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("scrollend", confirm);
  INPUT_EVENTS.forEach((type) =>
    window.addEventListener(type, onInput, { capture: true, passive: true }),
  );
  // A page that does not move sends no scroll event at all.
  restartQuietTimer();
  return cleanup;
}
