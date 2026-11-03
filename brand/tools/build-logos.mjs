// Builds brand/logo/logo-{full,icon,mono}.svg from brand/mascot/mascot-layered.svg and the brand fonts.
// Run it again (npm run logos) after every change to the mascot; a test fails while the logos are stale.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { parseSync, stringify } from 'svgson';
import { contentBBox, visibleBBox } from './lib/svg-check.mjs';

const brandDir = new URL('../', import.meta.url);
const mascotPath = fileURLToPath(new URL('mascot/mascot-layered.svg', brandDir));
const fontsDir = fileURLToPath(new URL('fonts/', brandDir));
const logoDir = fileURLToPath(new URL('logo/', brandDir));
const tokens = JSON.parse(readFileSync(fileURLToPath(new URL('tokens/tokens.json', brandDir)), 'utf8'));
const color = (name) => tokens.color[name].value;

const XMLNS = 'http://www.w3.org/2000/svg';
const MASCOT_SIZE = 512;
const AXIS_X = MASCOT_SIZE / 2;
const MARGIN = 0.04;

const TITLE = 'Nếp Nhà';
const TAGLINE = 'Xứ Đông · Gạo nếp cái hoa vàng';
const TITLE_WIDTH = 0.8 * MASCOT_SIZE;
const TITLE_GAP = 26;
const TAGLINE_WIDTH = 0.86 * MASCOT_SIZE;
const TAGLINE_GAP = 22;
const TAGLINE_LETTER_SPACING = 0.16;

const ICON_STROKE_SCALE = 1.9;
const ICON_EYE_SCALE = 1.35;
const ICON_DETAIL_STROKE = 4;
const ICON_DISC_SCALE = 1.04;
const ICON_DISC = color('vang-rom');
// The hat is Vàng rơm like the disc; in the icon it is lifted to Trắng gạo so it stands off the disc.
const ICON_DISC_LIFT = color('trang-gao');

const WIDE_STROKE = 10;
const FAR = 100000;

const num = (value) => String(Number(value.toFixed(1)));

function loadFont(file) {
  const buffer = readFileSync(fontsDir + file);
  return opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

// Text as outlines, scaled to the given ink width, centered on AXIS_X, ink top at top.
function textOutline(font, text, width, top, options = {}) {
  const probe = font.getPath(text, 0, 0, 100, options).getBoundingBox();
  const size = (100 * width) / (probe.x2 - probe.x1);
  const box = font.getPath(text, 0, 0, size, options).getBoundingBox();
  const path = font.getPath(text, AXIS_X - (box.x1 + box.x2) / 2, top - box.y1, size, options);
  return { d: path.toPathData(1), bottom: top + box.y2 - box.y1 };
}

function wordmark() {
  const title = textOutline(loadFont('Pacifico-Regular.ttf'), TITLE, TITLE_WIDTH, MASCOT_SIZE + TITLE_GAP);
  const tagline = textOutline(
    loadFont('Quicksand-700.ttf'),
    TAGLINE.toLocaleUpperCase('vi'),
    TAGLINE_WIDTH,
    title.bottom + TAGLINE_GAP,
    { letterSpacing: TAGLINE_LETTER_SPACING },
  );
  return (
    `<path d="${title.d}" fill="${color('nau-dat')}"/>\n` + `<path d="${tagline.d}" fill="${color('nau-ao')}"/>\n`
  );
}

// Painted box of loose content. The draft viewBox is the geometric box (contentBBox, which ignores
// clipping) so that visibleBBox renders a small canvas around the content.
function paintedBox(content) {
  const wide = `<svg xmlns="${XMLNS}" viewBox="0 0 ${MASCOT_SIZE} ${MASCOT_SIZE}">${content}</svg>`;
  const rough = contentBBox(wide);
  const draft = [rough.x, rough.y, rough.width, rough.height].map((v, i) => (i < 2 ? Math.floor(v) - 1 : Math.ceil(v) + 2));
  return visibleBBox(`<svg xmlns="${XMLNS}" viewBox="${draft.join(' ')}">${content}</svg>`);
}

// Wraps the content in a root <svg> whose viewBox is the painted box plus MARGIN of its longer side
// (square = true makes the viewBox square around the same center).
function frame(content, square = false) {
  const box = paintedBox(content);
  const pad = MARGIN * Math.max(box.width, box.height);
  let [x, y, width, height] = [box.x - pad, box.y - pad, box.width + 2 * pad, box.height + 2 * pad];
  if (square) {
    const side = Math.max(width, height);
    [x, y, width, height] = [x - (side - width) / 2, y - (side - height) / 2, side, side];
  }
  return `<svg xmlns="${XMLNS}" viewBox="${[x, y, width, height].map(num).join(' ')}">\n${content}</svg>\n`;
}

const elements = (node) => node.children.filter((child) => child.type === 'element');
const byId = (node, id) => {
  if (node.attributes.id === id) return node;
  for (const child of elements(node)) {
    const found = byId(child, id);
    if (found) return found;
  }
  return null;
};

// Root-level drawing attributes of the mascot (stroke color, joins, caps) that its groups inherit.
const inheritedRoot = (mascot) => {
  const { xmlns, viewBox, ...rest } = mascot.attributes;
  return rest;
};

const attrs = (attributes) =>
  Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');

// The whole mascot in its own 512 x 512 viewport. The viewport clips the bust where the drawing
// leaves the canvas (y = 512), and it keeps the transform-box: view-box pivots of #head / #rice
// valid, so a page can animate the groups exactly as in the mascot file.
function fullMascot(mascot) {
  const inner = elements(mascot).map((child) => stringify(child)).join('\n');
  return (
    `<svg id="mascot" x="0" y="0" width="${MASCOT_SIZE}" height="${MASCOT_SIZE}" viewBox="${mascot.attributes.viewBox}">\n` +
    `<g${attrs(inheritedRoot(mascot))}>\n${inner}\n</g>\n</svg>\n`
  );
}

// Effective paint of an element: own attribute, else inherited.
function paint(node, inherited) {
  const own = node.attributes;
  return {
    fill: own.fill ?? inherited.fill,
    stroke: own.stroke ?? inherited.stroke ?? 'none',
    strokeWidth: Number(own['stroke-width'] ?? inherited['stroke-width'] ?? 1),
  };
}

const inherit = (node, inherited) => ({
  ...inherited,
  ...Object.fromEntries(
    ['fill', 'stroke', 'stroke-width'].filter((key) => key in node.attributes).map((key) => [key, node.attributes[key]]),
  ),
});

const same = (a, b) => a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase();

// Head only, simplified for small sizes: the age lines, hair shine and hat strap (Nâu áo lines) and
// the thin hair strands go; every other line gets thicker and the eyes bigger.
function simplifyHead(node, inherited) {
  const own = paint(node, inherited);
  const copy = { ...node, attributes: { ...node.attributes }, children: [] };
  delete copy.attributes['data-pivot'];
  delete copy.attributes.style;
  delete copy.attributes.id;
  if ('stroke-width' in copy.attributes) copy.attributes['stroke-width'] = num(own.strokeWidth * ICON_STROKE_SCALE);
  if (same(node.attributes.fill, ICON_DISC)) copy.attributes.fill = ICON_DISC_LIFT;
  if (node.name === 'ellipse' && same(own.fill, color('nau-dat')) && own.stroke === 'none') {
    copy.attributes.rx = num(Number(node.attributes.rx) * ICON_EYE_SCALE);
    copy.attributes.ry = num(Number(node.attributes.ry) * ICON_EYE_SCALE);
  }
  const next = inherit(node, inherited);
  for (const child of elements(node)) {
    const p = paint(child, next);
    const line = p.fill === 'none';
    if (line && same(p.stroke, color('nau-ao'))) continue;
    if (line && same(p.stroke, color('nau-dat')) && p.strokeWidth < ICON_DETAIL_STROKE) continue;
    copy.children.push(simplifyHead(child, next));
  }
  return copy;
}

function iconLogo(mascot) {
  const rootPaint = inheritedRoot(mascot);
  const head = simplifyHead(byId(mascot, 'head'), rootPaint);
  const drawing = `<g${attrs(rootPaint)}>\n${stringify(head)}\n</g>\n`;
  const box = paintedBox(drawing);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = (ICON_DISC_SCALE * Math.max(box.width, box.height)) / 2;
  return frame(`<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" fill="${ICON_DISC}"/>\n${drawing}`, true);
}

// ---------- mono ----------

function ellipsePath(cx, cy, rx, ry) {
  return `M${num(cx - rx)} ${num(cy)}A${num(rx)} ${num(ry)} 0 1 0 ${num(cx + rx)} ${num(cy)}A${num(rx)} ${num(ry)} 0 1 0 ${num(cx - rx)} ${num(cy)}Z`;
}

function rectPath({ x = '0', y = '0', width, height, rx, ry }) {
  const [x0, y0, w, h] = [x, y, width, height].map(Number);
  const rX = Math.min(Number(rx ?? ry ?? 0), w / 2);
  const rY = Math.min(Number(ry ?? rx ?? 0), h / 2);
  if (rX === 0 || rY === 0) return `M${num(x0)} ${num(y0)}H${num(x0 + w)}V${num(y0 + h)}H${num(x0)}Z`;
  const arc = (ex, ey) => `A${num(rX)} ${num(rY)} 0 0 1 ${num(ex)} ${num(ey)}`;
  return (
    `M${num(x0 + rX)} ${num(y0)}H${num(x0 + w - rX)}${arc(x0 + w, y0 + rY)}V${num(y0 + h - rY)}` +
    `${arc(x0 + w - rX, y0 + h)}H${num(x0 + rX)}${arc(x0, y0 + h - rY)}V${num(y0 + rY)}${arc(x0 + rX, y0)}Z`
  );
}

// Outline path of a node's fill area, in the node's own user space.
function fillGeometry(node, mascot) {
  const a = node.attributes;
  switch (node.name) {
    case 'path':
      return a.d;
    case 'rect':
      return rectPath(a);
    case 'circle':
      return ellipsePath(Number(a.cx ?? 0), Number(a.cy ?? 0), Number(a.r), Number(a.r));
    case 'ellipse':
      return ellipsePath(Number(a.cx ?? 0), Number(a.cy ?? 0), Number(a.rx), Number(a.ry));
    case 'use':
      return fillGeometry(byId(mascot, (a.href ?? a['xlink:href']).slice(1)), mascot);
    default:
      throw new Error(`logo-mono: unsupported shape <${node.name}>`);
  }
}

// Area of a wide round-capped stroke on a straight segment "M x y L x y" (a capsule).
function capsulePath(d, width) {
  const match = /^M\s*([-\d.]+)[\s,]+([-\d.]+)\s*L\s*([-\d.]+)[\s,]+([-\d.]+)$/.exec(d.trim());
  if (match === null) throw new Error(`logo-mono: wide light stroke must be one straight segment, got "${d}"`);
  const [ax, ay, bx, by] = match.slice(1).map(Number);
  const length = Math.hypot(bx - ax, by - ay);
  const r = width / 2;
  const [nx, ny] = [(-(by - ay) / length) * r, ((bx - ax) / length) * r];
  const arc = (x, y) => `A${num(r)} ${num(r)} 0 0 0 ${num(x)} ${num(y)}`;
  return (
    `M${num(ax + nx)} ${num(ay + ny)}L${num(bx + nx)} ${num(by + ny)}${arc(bx - nx, by - ny)}` +
    `L${num(ax - nx)} ${num(ay - ny)}${arc(ax + nx, ay + ny)}Z`
  );
}

// Flattens the mascot into paint order: each shape with its full transform and effective paint.
function flatten(node, mascot, inherited, transforms, out) {
  for (const child of elements(node)) {
    if (child.name === 'defs') continue;
    const chain = child.attributes.transform ? [...transforms, child.attributes.transform] : transforms;
    if (child.name === 'g') {
      flatten(child, mascot, inherit(child, inherited), chain, out);
      continue;
    }
    const p = paint(child, inherited);
    if (p.fill === undefined) throw new Error(`logo-mono: <${child.name}> has no fill (default black)`);
    out.push({ node: child, transform: chain.join(' '), ...p });
  }
  return out;
}

// One-color mascot. Every Nâu đất line and fill stays; other fills become empty, and other-color
// lines go. A color fill or a wide light stroke hid what lay under it, so, as it is reached in paint
// order, everything drawn before it is clipped by the outside of its area. Hair stays solid around
// the face, and lines under the hands, rice grains and sleeves stay hidden.
function monoMascot(mascot) {
  const dark = color('nau-dat');
  const shapes = flatten(mascot, mascot, { stroke: mascot.attributes.stroke }, [], []);
  // A thin color line drawn on a wider dark line of the same path is an outlined strand (the rice
  // stalks). Kept at full width the strands merge into one dark bar, so the strand is drawn as one
  // dark line as wide as its color core.
  const isLine = (s) => s.fill === 'none' && s.stroke !== 'none';
  for (const core of shapes.filter((s) => isLine(s) && !same(s.stroke, dark) && s.strokeWidth < WIDE_STROKE)) {
    const outline = shapes.find(
      (s) => isLine(s) && same(s.stroke, dark) && s.node.attributes.d === core.node.attributes.d && s.transform === core.transform,
    );
    if (outline !== undefined) outline.strokeWidth = core.strokeWidth;
  }
  const clips = [];
  let drawn = '';
  const hideUnder = (area, transform) => {
    const id = `mono-cut-${clips.length + 1}`;
    const outside = `M${-FAR} ${-FAR}H${FAR}V${FAR}H${-FAR}Z`;
    const placed = transform ? ` transform="${transform}"` : '';
    clips.push(`<clipPath id="${id}"><path${placed} clip-rule="evenodd" d="${outside}${area}"/></clipPath>`);
    drawn = `<g clip-path="url(#${id})">\n${drawn}</g>\n`;
  };
  for (const { node, transform, fill, stroke, strokeWidth } of shapes) {
    const placed = transform ? ` transform="${transform}"` : '';
    const darkFill = same(fill, dark);
    const darkStroke = same(stroke, dark);
    if (fill !== 'none' && !darkFill) hideUnder(fillGeometry(node, mascot), transform);
    if (fill === 'none' && stroke !== 'none' && !darkStroke && strokeWidth >= WIDE_STROKE) {
      hideUnder(capsulePath(node.attributes.d, strokeWidth), transform);
    }
    if (!darkFill && !darkStroke) continue;
    const strokePart = darkStroke ? ` stroke="${dark}" stroke-width="${num(strokeWidth)}"` : ' stroke="none"';
    drawn += `<path${placed} d="${fillGeometry(node, mascot)}" fill="${darkFill ? dark : 'none'}"${strokePart}/>\n`;
  }
  const { stroke, ...joins } = inheritedRoot(mascot);
  return (
    `<defs>\n${clips.join('\n')}\n</defs>\n` +
    `<svg x="0" y="0" width="${MASCOT_SIZE}" height="${MASCOT_SIZE}" viewBox="${mascot.attributes.viewBox}">\n` +
    `<g${attrs(joins)}>\n${drawn}</g>\n</svg>\n`
  );
}

export function buildLogos() {
  const mascot = parseSync(readFileSync(mascotPath, 'utf8'));
  const words = wordmark();
  return {
    'logo-full.svg': frame(fullMascot(mascot) + words),
    'logo-icon.svg': iconLogo(mascot),
    'logo-mono.svg': frame(monoMascot(mascot) + words.replace(new RegExp(color('nau-ao'), 'g'), color('nau-dat'))),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(logoDir, { recursive: true });
  for (const [file, svg] of Object.entries(buildLogos())) {
    writeFileSync(logoDir + file, svg);
    console.log(`wrote brand/logo/${file} (${Buffer.byteLength(svg)} bytes)`);
  }
}
