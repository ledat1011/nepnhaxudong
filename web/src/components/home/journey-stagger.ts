/** The frame shape a photo gets, from its own orientation: a portrait photo is not cropped to a square. */
export type FrameShape = "portrait" | "square" | "wide";

/** Width divided by height of each frame shape. */
export const FRAME_RATIO: Record<FrameShape, number> = { portrait: 3 / 4, square: 1, wide: 4 / 3 };

/** A photo within 10% of square gets a square frame; anything taller is portrait, anything wider is wide. */
export function frameShape(width: number, height: number): FrameShape {
  const ratio = width / height;
  if (ratio < 0.9) return "portrait";
  if (ratio > 1.1) return "wide";
  return "square";
}

/** How far two neighbouring frames overlap, as a share of the stage width (the owner's sketch, option A). */
export const OVERLAP = 0.0733;
/** Each next frame starts this far down the one before, as a share of the frame height. */
export const STEP_DOWN = 0.74;

/** One frame's place in the stage, in percent: left and width of the stage width, top and height of its height. */
export type FrameBox = { shape: FrameShape; left: number; top: number; width: number; height: number };

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Lays out 2 or 3 photos in a zigzag down the stage (2026-11-06, option C of the certificate
 * review): every frame has the same height and its own shape, the first and third frames sit on
 * the left edge, the second on the right edge, and each neighbouring pair overlaps by at least
 * `OVERLAP` of the width. Returns the stage's width/height ratio and each frame's box.
 */
export function staggerLayout(shapes: readonly FrameShape[]): { aspectRatio: number; frames: FrameBox[] } {
  const ratios = shapes.map((shape) => FRAME_RATIO[shape]);
  // The pair with the smallest total width sets the height, so it overlaps by exactly OVERLAP and
  // every other pair overlaps more. No frame is ever wider than the stage: the widest shape is 4:3
  // and two of them give a height of 1.0733 / 2.667, about 0.40 of the width.
  const pairWidths = ratios.slice(1).map((r, i) => ratios[i] + r);
  const height = (1 + OVERLAP) / Math.min(...pairWidths);
  const stageHeight = (shapes.length - 1) * STEP_DOWN * height + height;
  const frames = shapes.map((shape, i) => {
    const width = ratios[i] * height;
    return {
      shape,
      left: round(i % 2 === 1 ? (1 - width) * 100 : 0),
      top: round(((i * STEP_DOWN * height) / stageHeight) * 100),
      width: round(width * 100),
      height: round((height / stageHeight) * 100),
    };
  });
  return { aspectRatio: round(1 / stageHeight), frames };
}
