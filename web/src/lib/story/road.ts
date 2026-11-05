/**
 * The dirt road of the story timeline. Each scene draws one stretch of it, from its stop down
 * to the next scene's stop, in a 100 x 100 box that the page stretches to the scene's height.
 * A stretch starts and ends in the middle of the box and goes straight down there, so the
 * stretches join without a corner; half way it bends to one side.
 */

/** Half way down, the stretch of the 1st, 3rd ... scene is this far right (of 100). */
export const ROAD_BEND_RIGHT = 75;
/** ... and the stretch of the 2nd, 4th ... scene this far left. */
export const ROAD_BEND_LEFT = 25;

/** The road bends away from the scene's own side: right for the scenes on the left. */
export function roadBend(index: number): number {
  return index % 2 === 0 ? ROAD_BEND_RIGHT : ROAD_BEND_LEFT;
}

type Point = { x: number; y: number };

/** The two cubic curves of a stretch: middle top to the bend, then the bend to middle bottom. */
function curves(bend: number): [Point, Point, Point, Point][] {
  return [
    [
      { x: 50, y: 0 },
      { x: 50, y: 25 },
      { x: bend, y: 25 },
      { x: bend, y: 50 },
    ],
    [
      { x: bend, y: 50 },
      { x: bend, y: 75 },
      { x: 50, y: 75 },
      { x: 50, y: 100 },
    ],
  ];
}

/** The svg path of a stretch in its 100 x 100 box. */
export function roadPath(bend: number): string {
  const [[a, b, c, d], [, e, f, g]] = curves(bend);
  return `M${a.x} ${a.y}C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}C${e.x} ${e.y} ${f.x} ${f.y} ${g.x} ${g.y}`;
}

const cubic = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};

const SOLVE_STEPS = 20;

/**
 * The point of the stretch at the height `part` (0 = top, 1 = bottom), in the 100 x 100 box.
 * The height of each curve grows with its parameter, so the parameter is found by halving.
 */
export function roadPoint(bend: number, part: number): Point {
  const y = Math.min(1, Math.max(0, part)) * 100;
  const curve = curves(bend)[y < 50 ? 0 : 1];
  let low = 0;
  let high = 1;
  for (let i = 0; i < SOLVE_STEPS; i++) {
    const mid = (low + high) / 2;
    if (cubic(curve[0].y, curve[1].y, curve[2].y, curve[3].y, mid) < y) low = mid;
    else high = mid;
  }
  const t = (low + high) / 2;
  if (y === 0 || y === 100) return { x: 50, y };
  return {
    x: cubic(curve[0].x, curve[1].x, curve[2].x, curve[3].x, t),
    y: cubic(curve[0].y, curve[1].y, curve[2].y, curve[3].y, t),
  };
}
