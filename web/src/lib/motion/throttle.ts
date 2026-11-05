/**
 * The looping motion (hero, story scenes) draws at most this many frames per second. Its motion
 * is slow, so 30 frames look the same as 60 and cost half the paint. GSAP's own ticker keeps
 * 60/s for every other animation.
 */
export const LOOP_UPDATES_PER_S = 30;

/** Less than one 30/s frame, so a frame that a 60 Hz screen shows a little early still draws. */
export const LOOP_MIN_GAP_S = 1 / LOOP_UPDATES_PER_S - 0.004;

/** A `gsap.quickSetter` for one number. */
export type Setter = (value: number) => void;
