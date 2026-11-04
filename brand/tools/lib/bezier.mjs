// Geometry for hand-drawn SVG: smooth curves through points (Catmull-Rom -> cubic Bezier), compact
// path text, points along a curve, and a rice grain shape.

// One decimal, no "-0".
export const fmt = (v) => {
  const r = Math.round(v * 10) / 10;
  return (Object.is(r, -0) ? 0 : r).toString();
};

// Numbers with the fewest separators: no space before "-", no leading zero, and no space before
// ".5" when the number before already has a decimal point (SVG path syntax allows both).
export const nums = (values) =>
  values
    .map((v) => fmt(v).replace(/^(-?)0\./, '$1.'))
    .reduce((text, token, i) => {
      if (i === 0) return token;
      const previous = text.split(/[ -]/).pop();
      const joined = token.startsWith('-') || (token.startsWith('.') && previous.includes('.'));
      return text + (joined ? '' : ' ') + token;
    }, '');

// Smooth curve through points, as cubic segments [p0, c1, c2, p3]. A point is [x, y], or
// [x, y, 'c'] for a sharp corner, or [x, y, 0, k] for a tighter turn (handles k times as long).
export function spline(points, closed = true) {
  const K = 1 / 6;
  const n = points.length;
  const at = (i) => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  const handle = (p) => (p[2] === 'c' ? 0 : (p[3] ?? 1) * K);
  const segs = [];
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const [s1, s2] = [handle(p1), handle(p2)];
    segs.push([
      [p1[0], p1[1]],
      [p1[0] + (p2[0] - p0[0]) * s1, p1[1] + (p2[1] - p0[1]) * s1],
      [p2[0] - (p3[0] - p1[0]) * s2, p2[1] - (p3[1] - p1[1]) * s2],
      [p2[0], p2[1]],
    ]);
  }
  return segs;
}

// Path data with relative cubics. Every point is rounded first, so the relative steps add up
// exactly and no rounding error builds up along the path.
export function d(segs, closed = true) {
  const round = (p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];
  const rounded = segs.map((seg) => seg.map(round));
  let text = `M${nums(rounded[0][0])}`;
  for (const [p0, c1, c2, p3] of rounded) {
    text += 'c' + nums([c1[0] - p0[0], c1[1] - p0[1], c2[0] - p0[0], c2[1] - p0[1], p3[0] - p0[0], p3[1] - p0[1]]);
  }
  return closed ? `${text}z` : text;
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function pointOn([a, b, c, e], t) {
  const [ab, bc, ce] = [lerp(a, b, t), lerp(b, c, t), lerp(c, e, t)];
  return lerp(lerp(ab, bc, t), lerp(bc, ce, t), t);
}

// Point and direction (radians) at a distance along a curve.
export function walker(segs) {
  const SAMPLES = 64;
  const points = segs.flatMap((seg) => Array.from({ length: SAMPLES + 1 }, (_, k) => pointOn(seg, k / SAMPLES)));
  const length = [0];
  for (let i = 1; i < points.length; i++) {
    length.push(length[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = length[length.length - 1];
  const at = (s) => {
    const want = Math.max(0, Math.min(total, s));
    const i = Math.max(1, length.findIndex((v) => v >= want));
    const f = (want - length[i - 1]) / (length[i] - length[i - 1] || 1);
    const [a, b] = [points[i - 1], points[i]];
    return { p: lerp(a, b, f), angle: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  return { total, at };
}

// A rice grain: a pointed oval, len long and wid wide, centered at center, long axis at angle.
export function grain(center, angle, len, wid) {
  const [L, W] = [len / 2, wid / 2];
  const local = [
    [[L, 0], [L * 0.45, -W * 1.36], [-L * 0.62, -W * 1.36], [-L, 0]],
    [[-L, 0], [-L * 0.62, W * 1.36], [L * 0.45, W * 1.36], [L, 0]],
  ];
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  return local.map((seg) => seg.map(([x, y]) => [center[0] + x * cos - y * sin, center[1] + x * sin + y * cos]));
}
