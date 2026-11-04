"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getLoopController, type LoopController } from "@/lib/motion/loops";

type MotionPauseButtonProps = { dict: Dictionary; controller?: LoopController };

/**
 * Pauses and resumes the looping motion of the page. It is hidden until the motion code has
 * started (`html[data-motion=on]`), so it never shows on a page with reduced motion or without
 * JavaScript. The server renders the "running" state; the saved choice is read after hydration.
 * It is a small round 44 x 44 px icon button (pause bars or play triangle). The name comes from
 * `aria-label`, and the same text is in `title` for mouse users.
 */
export function MotionPauseButton({ dict, controller }: MotionPauseButtonProps) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const source = controller ?? getLoopController();
    // The saved choice is only known in the browser, so it is read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaused(source.isPaused());
    return source.subscribe(setPaused);
  }, [controller]);

  const label = paused ? dict.motion.resume : dict.motion.pause;

  return (
    <button
      type="button"
      aria-pressed={paused}
      aria-label={label}
      title={label}
      onClick={() => (controller ?? getLoopController()).setPaused(!paused)}
      className="hidden size-11 items-center justify-center rounded-full border-2 border-coat bg-rice text-earth hover:bg-straw focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat [html[data-motion=on]_&]:inline-flex"
    >
      {paused ? (
        <svg data-glyph="play" viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="size-5">
          <path d="M6 3.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L7.5 2.64A1 1 0 0 0 6 3.5z" fill="currentColor" />
        </svg>
      ) : (
        <svg data-glyph="pause" viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="size-5">
          <rect x="4" y="3" width="4" height="14" rx="1.5" fill="currentColor" />
          <rect x="12" y="3" width="4" height="14" rx="1.5" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}
