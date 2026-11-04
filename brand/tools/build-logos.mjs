// Builds brand/logo/logo-{full,icon,mono}.svg and the brand fonts:
// - logo-full from the detailed illustration brand/mascot/mascot-layered.svg (large uses);
// - logo-mono from the simplified logo mascot brand/logo/mascot-logo.svg (small sizes, one-color print);
// - logo-icon from brand/logo/mascot-logo-head.svg: the logo mascot's whole head, without the holes
//   where the rice lies in front of it.
// Run it again (npm run logos) after every change to a mascot; a test fails while the logos are stale.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { parseSync, stringify } from 'svgson';
import { contentBBox, visibleBBox } from './lib/svg-check.mjs';

const brandDir = new URL('../', import.meta.url);
const mascotPath = fileURLToPath(new URL('mascot/mascot-layered.svg', brandDir));
const logoMascotPath = fileURLToPath(new URL('logo/mascot-logo.svg', brandDir));
const logoMascotHeadPath = fileURLToPath(new URL('logo/mascot-logo-head.svg', brandDir));
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

// These three only act on stroked lines and eye ellipses in the icon's head. The head of
// mascot-logo-head.svg is traced (filled paths only), so for it they do nothing today.
const ICON_STROKE_SCALE = 1.3;
const ICON_EYE_SCALE = 1.35;
const ICON_DETAIL_STROKE = 4;
const ICON_DISC_SCALE = 1.04;
const ICON_DISC = color('vang-rom');
// The hat is Vàng rơm like the disc; in the icon it is lifted to Trắng gạo so it stands off the disc.
const ICON_DISC_LIFT = color('trang-gao');

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

// viewBox = the painted box plus MARGIN of its longer side (square = true makes it square around
// the same center).
function frameViewBox(content, square = false) {
  const box = paintedBox(content);
  const pad = MARGIN * Math.max(box.width, box.height);
  let [x, y, width, height] = [box.x - pad, box.y - pad, box.width + 2 * pad, box.height + 2 * pad];
  if (square) {
    const side = Math.max(width, height);
    [x, y, width, height] = [x - (side - width) / 2, y - (side - height) / 2, side, side];
  }
  return [x, y, width, height].map(num).join(' ');
}

const wrap = (viewBox, content) => `<svg xmlns="${XMLNS}" viewBox="${viewBox}">\n${content}</svg>\n`;
const frame = (content, square = false) => wrap(frameViewBox(content, square), content);

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

// Head only, for the icon. On the traced head (filled paths) it lifts the Vàng rơm hat to Trắng gạo
// and drops id, data-pivot and style. On a stroked, hand-drawn head it also drops Nâu áo lines and
// thin Nâu đất lines, thickens the other lines and enlarges the eye ellipses.
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

function iconLogo(headFull) {
  const rootPaint = inheritedRoot(headFull);
  const head = simplifyHead(byId(headFull, 'head'), rootPaint);
  const drawing = `<g${attrs(rootPaint)}>\n${stringify(head)}\n</g>\n`;
  const box = paintedBox(drawing);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = (ICON_DISC_SCALE * Math.max(box.width, box.height)) / 2;
  return frame(`<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" fill="${ICON_DISC}"/>\n${drawing}`, true);
}

// ---------- mono ----------

const INK = '#FFFFFF';
// Colors that print as ink in the one-color logo: the outlines and the black hair.
const INK_COLORS = [color('nau-dat'), color('toc')].map((c) => c.toLowerCase());
const PAPER = '#000000';
const MONO_SHAPES = new Set(['g', 'defs', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'use']);
// Kept as they are: they only shape the geometry, which the mask copy keeps unchanged.
const MONO_GEOMETRY = new Set([
  'd', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points',
  'transform', 'href', 'xlink:href', 'stroke-width', 'stroke-linejoin', 'stroke-linecap',
  'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'fill-rule', 'clip-rule',
]);
// Dropped: they only serve the animation of the color mascot.
const MONO_ANIMATION = new Set(['id', 'data-pivot', 'style']);
const MONO_OPACITY = new Set(['opacity', 'fill-opacity', 'stroke-opacity']);
const ANIMATION_STYLE =/^\s*(transform-box|transform-origin)\s*:/;

function monoColor(value, where) {
  if (value === 'none') return value;
  const hex = value.toLowerCase();
  if (INK_COLORS.includes(hex)) return INK;
  if (Object.values(tokens.color).some((c) => c.value.toLowerCase() === hex)) return PAPER;
  throw new Error(`logo-mono: ${where} has color "${value}", not a palette color`);
}

// Copy of one mascot node for the mask: Nâu đất and the hair become ink (white), every other palette color
// becomes paper (black), geometry stays. Anything else throws, so a redrawn mascot cannot lose
// something silently: opacity has no one-color form, and unknown attributes or elements may paint.
function monoNode(node, keepIds) {
  const where = `<${node.name}${node.attributes.id ? ` id="${node.attributes.id}"` : ''}>`;
  if (!MONO_SHAPES.has(node.name)) throw new Error(`logo-mono: unsupported element ${where}`);
  const attributes = {};
  for (const [key, value] of Object.entries(node.attributes)) {
    if (key === 'fill' || key === 'stroke') attributes[key] = monoColor(value, `${where} ${key}`);
    else if (MONO_GEOMETRY.has(key)) attributes[key] = value;
    else if (key === 'id' && keepIds) attributes[key] = value;
    else if (key === 'style') {
      const unknown = value.split(';').filter((decl) => decl.trim() !== '' && !ANIMATION_STYLE.test(decl));
      if (unknown.length > 0) throw new Error(`logo-mono: ${where} style "${unknown.join(';')}" is not handled`);
    } else if (MONO_OPACITY.has(key)) {
      throw new Error(`logo-mono: ${where} ${key}="${value}" has no one-color form`);
    } else if (!MONO_ANIMATION.has(key)) throw new Error(`logo-mono: ${where} attribute ${key} is not handled`);
  }
  const children = node.children.map((child) => {
    if (child.type === 'element') return monoNode(child, keepIds || node.name === 'defs');
    if (child.type === 'text' && child.value.trim() !== '') throw new Error(`logo-mono: text inside ${where}`);
    return null;
  });
  return { ...node, attributes, children: children.filter((child) => child !== null) };
}

// One-color mascot. The mask repaints the mascot in paint order with two tones, so whatever a color
// shape covers in the color mascot stays covered: the hair stays solid around an empty face, and
// lines under the hands, grains and sleeves stay hidden. One Nâu đất rectangle shows through the
// ink. The mask region is the 512 x 512 canvas, which also cuts the bust at its bottom edge.
export function monoMascot(source) {
  const mascot = parseSync(source);
  const { xmlns, viewBox, ...rootPaint } = mascot.attributes;
  const root = monoNode({ ...mascot, name: 'g', attributes: rootPaint }, false);
  const [, , width, height] = viewBox.trim().split(/[\s,]+/);
  return (
    `<defs>\n<mask id="mono-ink" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">\n` +
    `${stringify(root)}\n</mask>\n</defs>\n` +
    `<svg x="0" y="0" width="${MASCOT_SIZE}" height="${MASCOT_SIZE}" viewBox="${viewBox}">\n` +
    `<rect width="${width}" height="${height}" fill="${color('nau-dat')}" mask="url(#mono-ink)"/>\n</svg>\n`
  );
}

// logo-mono takes the frame of logo-full, so the two can swap in any layout.
const logoFrame = (words) => frameViewBox(fullMascot(parseSync(readFileSync(mascotPath, 'utf8'))) + words);

// The logo mascot in color with the wordmark, in the frame of logo-mono: what logo-mono must match
// in one color (a test compares the two).
export function monoReference() {
  const words = wordmark();
  return wrap(logoFrame(words), fullMascot(parseSync(readFileSync(logoMascotPath, 'utf8'))) + words);
}

export function buildLogos() {
  const words = wordmark();
  const full = fullMascot(parseSync(readFileSync(mascotPath, 'utf8'))) + words;
  const viewBox = logoFrame(words);
  const monoWords = words.replace(new RegExp(color('nau-ao'), 'g'), color('nau-dat'));
  return {
    'logo-full.svg': wrap(viewBox, full),
    'logo-icon.svg': iconLogo(parseSync(readFileSync(logoMascotHeadPath, 'utf8'))),
    'logo-mono.svg': wrap(viewBox, monoMascot(readFileSync(logoMascotPath, 'utf8')) + monoWords),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(logoDir, { recursive: true });
  for (const [file, svg] of Object.entries(buildLogos())) {
    writeFileSync(logoDir + file, svg);
    console.log(`wrote brand/logo/${file} (${Buffer.byteLength(svg)} bytes)`);
  }
}
