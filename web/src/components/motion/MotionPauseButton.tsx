"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getLoopController, type LoopController } from "@/lib/motion/loops";

type MotionPauseButtonProps = { dict: Dictionary; controller?: LoopController };

/**
 * Pauses and resumes the looping motion of the page. It is hidden until the motion code has
 * started (`html[data-motion=on]`), so it never shows on a page with reduced motion or without
 * JavaScript. The server renders the "running" state; the saved choice is read after hydration.
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

  return (
    <button
      type="button"
      aria-pressed={paused}
      onClick={() => (controller ?? getLoopController()).setPaused(!paused)}
      className="hidden min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-coat bg-rice px-4 py-2 font-bold text-earth underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat [html[data-motion=on]_&]:inline-flex"
    >
      {paused ? dict.motion.resume : dict.motion.pause}
    </button>
  );
}
