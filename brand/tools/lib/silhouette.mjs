// The outer silhouette of a drawing as one smooth closed path, grown by a margin: the "sticker"
// border behind a mascot on a dark background.
//
// Render (alpha) -> close gaps narrower than 2 x close -> grow by width -> fill holes -> outer
// contour -> smooth -> simplify -> Catmull-Rom curve. Distances are exact (Euclidean distance
// transform), so the border has the same width everywhere.
import { Resvg } from '@resvg/resvg-js';
import { d, spline } from './bezier.mjs';

const INF = 1e20;

// Squared distance transform along one line (Felzenszwalb and Huttenlocher).
function edt1d(f, n, out, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s;
    do {
      const p = v[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
    } while (s <= z[k] && --k >= 0);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    out[q] = (q - v[k]) ** 2 + f[v[k]];
  }
}

// Distance (pixels) from every pixel to the nearest pixel where mask is set.
function distanceTo(mask, w, h) {
  const grid = new Float64Array(w * h);
  for (let p = 0; p < w * h; p++) grid[p] = mask[p] ? 0 : INF;
  const n = Math.max(w, h);
  const [f, out, v, z] = [new Float64Array(n), new Float64Array(n), new Int32Array(n), new Float64Array(n + 1)];
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, out, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = out[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, w, out, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(out[x]);
  }
  return grid;
}

const grow = (mask, w, h, r) => distanceTo(mask, w, h).map((dist) => (dist <= r ? 1 : 0));
const shrink = (mask, w, h, r) => {
  const outside = mask.map((m) => (m ? 0 : 1));
  return distanceTo(outside, w, h).map((dist) => (dist > r ? 1 : 0));
};

// Set every pixel the outside (flood fill from the border) does not reach.
function fillHoles(mask, w, h) {
  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (outside[p] || mask[p]) continue;
    outside[p] = 1;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  return outside.map((o) => (o ? 0 : 1));
}

// The longest closed boundary along pixel edges (corner coordinates), as points in order.
function outerContour(mask, w, h) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  // Directed edges with the inside on the right; keyed by start corner.
  const next = new Map();
  const key = (x, y) => y * (w + 1) + x;
  const add = (x0, y0, x1, y1) => next.set(key(x0, y0), [x1, y1]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x, y - 1)) add(x, y, x + 1, y);
      if (!inside(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!inside(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!inside(x - 1, y)) add(x, y + 1, x, y);
    }
  }
  let best = [];
  const seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let k = start;
    while (!seen.has(k) && next.has(k)) {
      seen.add(k);
      loop.push([k % (w + 1), Math.floor(k / (w + 1))]);
      const [x, y] = next.get(k);
      k = key(x, y);
    }
    if (loop.length > best.length) best = loop;
  }
  return best;
}

function smoothLoop(points, radius) {
  const n = points.length;
  return points.map((_, i) => {
    let [sx, sy] = [0, 0];
    for (let j = -radius; j <= radius; j++) {
      const [x, y] = points[(i + j + n) % n];
      sx += x;
      sy += y;
    }
    return [sx / (2 * radius + 1), sy / (2 * radius + 1)];
  });
}

// Ramer-Douglas-Peucker on an open polyline.
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length = Math.hypot(dx, dy) || 1;
  let [far, index] = [0, 0];
  for (let i = 1; i < points.length - 1; i++) {
    const dist = Math.abs(dy * (points[i][0] - a[0]) - dx * (points[i][1] - a[1])) / length;
    if (dist > far) [far, index] = [dist, i];
  }
  if (far <= tolerance) return [a, b];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

// svg: the drawing; box: [x, y, width, height] of the area to look at, in its user units (it may
// reach past the drawing, so the border has room). close and width are in user units.
export function stickerPath(svg, box, { close, width, scale = 2, smooth = 3, tolerance = 0.6 }) {
  const [bx, by, bw, bh] = box;
  const [w, h] = [Math.round(bw * scale), Math.round(bh * scale)];
  const framed = svg.replace(/viewBox="[^"]*"/, `viewBox="${bx} ${by} ${bw} ${bh}"`);
  const image = new Resvg(framed, { fitTo: { mode: 'width', value: w } }).render();
  if (image.width !== w || image.height !== h) throw new Error(`sticker: render ${image.width} x ${image.height}`);
  const pixels = image.pixels;
  let mask = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) mask[p] = pixels[p * 4 + 3] >= 128 ? 1 : 0;
  mask = shrink(grow(mask, w, h, close * scale), w, h, close * scale);
  mask = fillHoles(grow(mask, w, h, width * scale), w, h);
  const loop = smoothLoop(smoothLoop(outerContour(mask, w, h), smooth * scale), smooth * scale);
  // Simplify as two halves, so the closed loop keeps its start and middle points.
  const half = Math.floor(loop.length / 2);
  const points = [
    ...simplify(loop.slice(0, half + 1), tolerance * scale).slice(0, -1),
    ...simplify([...loop.slice(half), loop[0]], tolerance * scale).slice(0, -1),
  ].map(([x, y]) => [bx + x / scale, by + y / scale]);
  return d(spline(points));
}
