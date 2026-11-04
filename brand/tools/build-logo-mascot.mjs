// Builds brand/logo/mascot-logo.svg (the simplified logo mascot, for logo-mono and logo-icon) and
// brand/logo/mascot-logo-head.svg (its whole head, for logo-icon).
//
// Body, rice and hands are drawn here as smooth curves, over the approved illustration as a guide:
// fewer and bigger rice grains, thicker outlines, fewer small details. The head is traced from the
// approved illustration by trace-logo-head.py, which needs the source PNG (kept outside the repo):
//
//   node build-logo-mascot.mjs --source SOURCE.png [--any-source]   trace the head again
//   node build-logo-mascot.mjs                                      keep the traced head in the files
//
// Run it with --source after a change to the rice: the head's holes follow the drawn rice.
// Same groups, order and pivots as mascot-layered.svg, so its animation works on this file too.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { d, fmt, grain, spline, walker } from './lib/bezier.mjs';
import { isDirectRun } from './lib/run.mjs';

const brandDir = new URL('../', import.meta.url);
const file = (path) => fileURLToPath(new URL(path, brandDir));
const tracerPath = fileURLToPath(new URL('trace-logo-head.py', import.meta.url));
export const LOGO_MASCOT = 'mascot-logo.svg';
export const LOGO_MASCOT_HEAD = 'mascot-logo-head.svg';
const tokens = JSON.parse(readFileSync(file('tokens/tokens.json'), 'utf8'));
const C = Object.fromEntries(Object.entries(tokens.color).map(([name, { value }]) => [name, value]));

const SOURCE_SIZE = 1024;
// Line widths: outer outlines, inner lines (folds, seams), small parts (grains, leaves, fingers).
const OUTLINE = 6;
const INNER = 4.5;
const FINE = 4;
const STEM = 3.5;
const STRAW_LINE = 3;

const sp = (points, closed = true) => spline(points, closed);
const shape = (segs, fill, width = OUTLINE) => `<path d="${d(segs)}" fill="${fill}" stroke-width="${width}"/>`;
const line = (segs, width = INNER) => `<path d="${d(segs, false)}" fill="none" stroke-width="${width}"/>`;

// ---------- body ----------
// The neck reaches up and right under the head, so no gap shows between chin, hair and collar.
const NECK = [[240, 230], [244, 268], [268, 286], [300, 284], [324, 266], [346, 250], [346, 226]];
const BLOUSE = [
  [150, 500, 'c'], [143, 476], [116, 462], [100, 436], [104, 396], [128, 346], [172, 300], [212, 276], [247, 262, 'c'],
  [262, 278], [283, 284], [303, 278], [318, 262, 'c'], [352, 264], [388, 275], [418, 306], [441, 343], [457, 384], [459, 414],
  [452, 442], [432, 462], [414, 482], [408, 500, 'c'],
];
// Front opening, and the lower edge of the left sleeve across the body.
const BODY_LINES = [[[288, 290], [288, 400], [288, 498]], [[118, 462], [180, 456], [246, 436]]];
const BUTTON = { cx: 293, cy: 296, r: 3.5 };

// ---------- hands ----------
const HAND_UPPER = [
  [230, 362, 'c'], [252, 344], [270, 327], [290, 318], [308, 318], [321, 325], [325, 333], [322, 339, 'c'], [331, 342],
  [335, 350], [331, 356, 'c'], [336, 362], [333, 370], [322, 373, 'c'], [317, 378], [296, 384], [274, 397], [252, 413],
  [238, 421, 'c'],
];
const HAND_UPPER_FINGERS = [[[322, 339], [309, 336]], [[331, 356], [317, 354]]];
const HAND_LOWER = [
  [409, 438, 'c'], [393, 450], [366, 459], [338, 465], [310, 464], [294, 459], [289, 452, 'c'], [281, 448], [280, 440],
  [287, 436, 'c'], [280, 430], [283, 422], [295, 418], [310, 415], [338, 412], [370, 406], [396, 404, 'c'],
];
const HAND_LOWER_FINGERS = [[[287, 436], [301, 436]], [[289, 452], [302, 450]]];

// ---------- rice ----------
const GRAIN_LENGTH = 32;
const GRAIN_WIDTH = 17;
// Distance between grains along the stem; how far a grain sits off the stem (share of its width)
// and how much it turns away from the stem (radians).
const GRAIN_STEP = 13.5;
const GRAIN_OFFSET = 0.6;
const GRAIN_TURN = 0.6;
// Where the sheaf is held: every stem starts in the upper fist.
const GRIP = [284, 342];
// Drooping heads, back to front: the stem from the grip over its arch to the tip, and where on the
// stem (share of its length) the grains begin.
const PANICLES = [
  [[GRIP, [230, 268], [152, 212], [88, 206], [48, 234], [28, 314]], 0.47],
  [[GRIP, [232, 272], [162, 222], [108, 216], [70, 248], [46, 350]], 0.44],
  [[GRIP, [234, 277], [176, 232], [128, 230], [90, 276], [70, 398]], 0.4],
  [[GRIP, [237, 283], [194, 248], [156, 252], [124, 302], [108, 432]], 0.37],
  [[GRIP, [240, 290], [210, 266], [184, 278], [160, 330], [148, 454]], 0.34],
  [[GRIP, [246, 298], [226, 290], [210, 310], [194, 356], [188, 440]], 0.3],
  [[GRIP, [252, 305], [242, 310], [234, 330], [228, 366], [228, 404]], 0.3],
];
const LEAVES_BEHIND = [
  [[284, 340, 'c'], [220, 296], [130, 236], [52, 202, 'c'], [126, 252], [214, 318], [266, 356, 'c']],
  [[278, 344, 'c'], [196, 318], [96, 344], [46, 402, 'c'], [110, 362], [200, 340], [270, 360, 'c']],
];
const LEAVES_FRONT = [
  [[276, 350, 'c'], [214, 340], [150, 372], [102, 432, 'c'], [160, 390], [222, 362], [272, 362, 'c']],
  // The top leaf, along the front edge of the sheaf where it crosses the hat brim.
  [[96, 188, 'c'], [136, 192], [168, 212], [194, 238], [222, 270], [252, 304], [283, 338, 'c'], [268, 344], [238, 314],
    [208, 286], [178, 258], [146, 226], [118, 206]],
];
// Stalks from the fist up to the heads.
const STALKS = [[300, 352, 'c'], [262, 300], [226, 262, 'c'], [214, 284], [246, 330], [282, 380, 'c']];
// The straw bundle below the fist: an axis from BUNDLE_START at BUNDLE_ANGLE, BUNDLE_HALF wide on
// each side, ending in blunt straw ends at (distance along the axis, offset across it).
const BUNDLE_START = [296, 366];
const BUNDLE_ANGLE = 0.616;
const BUNDLE_HALF = 25;
const STRAW_ENDS = [[176, 20], [186, 10], [178, 0], [188, -10], [180, -20]];
const STRAW_END_HALF = 5;
// Two rope wraps across the bundle, at these distances along it.
const TIE_AT = [46, 60];
const TIE_WIDTH = 6;
const TIE_OUTLINE = 4;

function panicle(points, from) {
  const stem = sp(points, false);
  const { total, at } = walker(stem);
  const start = total * from;
  const end = total - GRAIN_LENGTH * 0.42;
  const count = Math.max(3, Math.round((end - start) / GRAIN_STEP) + 1);
  const grains = [];
  for (let k = 0; k < count; k++) {
    const { p, angle } = at(start + (k * (end - start)) / (count - 1));
    if (k === count - 1) {
      grains.push(grain(p, angle, GRAIN_LENGTH, GRAIN_WIDTH));
      continue;
    }
    const side = (count - 1 - k) % 2 ? 1 : -1;
    const off = GRAIN_WIDTH * GRAIN_OFFSET * side;
    const center = [p[0] - Math.sin(angle) * off, p[1] + Math.cos(angle) * off];
    grains.push(grain(center, angle + side * GRAIN_TURN, GRAIN_LENGTH, GRAIN_WIDTH));
  }
  // Tip first, so the grains nearer the arch lie on top.
  const paths = grains.reverse().map((g) => `<path d="${d(g)}"/>`).join('');
  return `${line(stem, STEM)}\n<g fill="${C['vang-lua']}" stroke-width="${FINE}">${paths}</g>`;
}

function rice() {
  const axis = [Math.cos(BUNDLE_ANGLE), Math.sin(BUNDLE_ANGLE)];
  const across = [axis[1], -axis[0]];
  const at = (t, o) => [BUNDLE_START[0] + axis[0] * t + across[0] * o, BUNDLE_START[1] + axis[1] * t + across[1] * o];
  const ends = STRAW_ENDS.flatMap(([t, o]) => [[...at(t - 1, o + STRAW_END_HALF), 'c'], [...at(t + 1, o - STRAW_END_HALF), 'c']]);
  const parts = [
    shape(sp(STALKS), C['vang-rom'], FINE),
    shape(sp([[...at(0, BUNDLE_HALF), 'c'], ...ends, [...at(0, -BUNDLE_HALF), 'c']]), C['vang-rom'], FINE),
    ...STRAW_ENDS.slice(1).map(([t, o]) => line(sp([at(4, o + STRAW_END_HALF), at(t - 4, o + STRAW_END_HALF)], false), STRAW_LINE)),
    ...LEAVES_BEHIND.map((leaf) => shape(sp(leaf), C['xanh-ma'], FINE)),
    ...PANICLES.map(([points, from]) => panicle(points, from)),
    ...LEAVES_FRONT.map((leaf) => shape(sp(leaf), C['xanh-ma'], FINE)),
  ];
  for (const t of TIE_AT) {
    const [a, b] = [at(t, BUNDLE_HALF - 3), at(t, -BUNDLE_HALF + 3)];
    const wrap = `M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}`;
    parts.push(`<path d="${wrap}" fill="none" stroke-width="${TIE_WIDTH + 2 * TIE_OUTLINE}"/>`);
    parts.push(`<path d="${wrap}" fill="none" stroke="${C['vang-lua']}" stroke-width="${TIE_WIDTH}"/>`);
  }
  return parts.join('\n');
}

function body() {
  return [
    shape(sp(NECK), C.da),
    shape(sp(BLOUSE), C['nau-ao']),
    ...BODY_LINES.map((points) => line(sp(points, false))),
    `<circle cx="${BUTTON.cx}" cy="${BUTTON.cy}" r="${BUTTON.r}" fill="${C['nau-dat']}" stroke="none"/>`,
  ].join('\n');
}

function hands() {
  return [
    shape(sp(HAND_UPPER), C.da),
    ...HAND_UPPER_FINGERS.map((points) => line(sp(points, false), FINE)),
    shape(sp(HAND_LOWER), C.da),
    ...HAND_LOWER_FINGERS.map((points) => line(sp(points, false), FINE)),
  ].join('\n');
}

// Pivots of the animated groups, as in mascot-layered.svg.
function pivots() {
  const mascot = readFileSync(file('mascot/mascot-layered.svg'), 'utf8');
  const pivot = (id) => {
    const found = mascot.match(new RegExp(`<g id="${id}" data-pivot="([\\d.]+) ([\\d.]+)"`));
    if (!found) throw new Error(`mascot-layered.svg: no data-pivot on g#${id}`);
    return [found[1], found[2]];
  };
  return { head: pivot('head'), rice: pivot('rice') };
}

const ROOT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" stroke="${C['nau-dat']}" stroke-linejoin="round" stroke-linecap="round">`;
const animated = ([x, y]) => ` data-pivot="${x} ${y}" style="transform-box: view-box; transform-origin: ${x}px ${y}px"`;
const traced = (paths) => paths.map(([pathData, fill]) => `<path d="${pathData}" fill="${fill}"/>`).join('\n');

// head / icon: traced paths [[d, fill], ...]. The traced head is filled paths only, so its group
// turns the root stroke off.
export function buildLogoMascot({ head, icon }) {
  const pivot = pivots();
  const mascot =
    `${ROOT}\n<g id="body">\n${body()}\n</g>\n` +
    `<g id="rice"${animated(pivot.rice)}>\n${rice()}\n</g>\n` +
    `<g id="hands">\n${hands()}\n</g>\n` +
    `<g id="head"${animated(pivot.head)} stroke="none">\n${traced(head)}\n</g>\n</svg>\n`;
  const whole = `${ROOT}\n<g id="head" stroke="none">\n${traced(icon)}\n</g>\n</svg>\n`;
  return { [LOGO_MASCOT]: mascot, [LOGO_MASCOT_HEAD]: whole };
}

// The traced head as it is in the committed files (in brand/logo, or in another folder). The files
// may have CRLF line ends (a Windows checkout), so the text is read with LF.
export function committedHead(dir = file('logo/')) {
  const pathsOf = (name) => {
    const svg = readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n');
    const group = svg.match(/<g id="head"[^>]*>\n([\s\S]*?)\n<\/g>/);
    if (!group) throw new Error(`${name}: no g#head`);
    return [...group[1].matchAll(/<path d="([^"]+)" fill="([^"]+)"\/>/g)].map((m) => [m[1], m[2]]);
  };
  return { head: pathsOf(LOGO_MASCOT), icon: pathsOf(LOGO_MASCOT_HEAD) };
}

// The rice group alone at the source size: trace-logo-head.py cuts the head where it is.
function riceMask() {
  const svg = `${ROOT}\n<g id="rice">\n${rice()}\n</g>\n</svg>\n`;
  return new Resvg(svg, { fitTo: { mode: 'width', value: SOURCE_SIZE } }).render().asPng();
}

function traceHead(source, anySource) {
  const dir = mkdtempSync(join(tmpdir(), 'logo-mascot-'));
  try {
    const mask = join(dir, 'rice.png');
    const out = join(dir, 'head.json');
    writeFileSync(mask, riceMask());
    const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
    const args = [tracerPath, source, mask, out, ...(anySource ? ['--any-source'] : [])];
    const run = spawnSync(python, args, { stdio: 'inherit' });
    if (run.status !== 0) throw new Error(`trace-logo-head.py failed (exit ${run.status ?? run.error})`);
    return JSON.parse(readFileSync(out, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (isDirectRun(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--source');
  const head = at >= 0 ? traceHead(args[at + 1], args.includes('--any-source')) : committedHead();
  for (const [name, svg] of Object.entries(buildLogoMascot(head))) {
    writeFileSync(file(`logo/${name}`), svg);
    console.log(`wrote brand/logo/${name} (${Buffer.byteLength(svg)} bytes)`);
  }
}
