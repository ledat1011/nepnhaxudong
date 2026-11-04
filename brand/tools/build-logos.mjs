// Builds brand/logo/logo-{full,icon,mono}.svg and the light versions logo-{full,mono}-light.svg
// from the mascots and the brand fonts:
// - logo-full from the detailed illustration brand/mascot/mascot-layered.svg (large uses);
// - logo-mono from the simplified logo mascot brand/logo/mascot-logo.svg (small sizes, one-color print);
// - logo-full-light / logo-mono-light: the same for dark backgrounds (light text, a Trắng gạo
//   sticker border around the mascot, Trắng gạo ink);
// - logo-icon from brand/logo/mascot-logo-head.svg: the logo mascot's whole head, without the holes
//   where the rice lies in front of it.
// Run it again (npm run logos) after every change to a mascot; a test fails while the logos are stale.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { parseSync, stringify } from 'svgson';
import { stickerPath } from './lib/silhouette.mjs';
import { isDirectRun } from './lib/run.mjs';
import { contentBBox, findById, visibleBBox } from './lib/svg-check.mjs';

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

const ICON_DISC_SCALE = 1.04;
const ICON_DISC = color('vang-rom');
// The hat is Vàng rơm like the disc; in the icon it is lifted to Trắng gạo so it stands off the disc.
const ICON_DISC_LIFT = color('trang-gao');

// Light versions, for dark backgrounds (Nâu đất): title and tagline colors (both form an AA pair
// with Nâu đất in textPairs), the one-color ink, and the sticker border behind the full mascot. The
// border grows the mascot's silhouette by STICKER_WIDTH after closing gaps up to 2 x STICKER_CLOSE
// wide (between grains and leaf tips), so it is one smooth shape without holes.
const LIGHT_TITLE = 'trang-gao';
const LIGHT_TAGLINE = 'vang-lua';
const LIGHT_INK = 'trang-gao';
const STICKER = 'trang-gao';
const STICKER_WIDTH = 9;
const STICKER_CLOSE = 10;
// Room around the 512 canvas when the silhouette is measured, so the border is not cut off.
const STICKER_PAD = 2 * (STICKER_WIDTH + STICKER_CLOSE);

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

function wordmark(titleColor = 'nau-dat', taglineColor = 'nau-ao') {
  const title = textOutline(loadFont('Pacifico-Regular.ttf'), TITLE, TITLE_WIDTH, MASCOT_SIZE + TITLE_GAP);
  const tagline = textOutline(
    loadFont('Quicksand-700.ttf'),
    TAGLINE.toLocaleUpperCase('vi'),
    TAGLINE_WIDTH,
    title.bottom + TAGLINE_GAP,
    { letterSpacing: TAGLINE_LETTER_SPACING },
  );
  return (
    `<path d="${title.d}" fill="${color(titleColor)}"/>\n` + `<path d="${tagline.d}" fill="${color(taglineColor)}"/>\n`
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

// Every id in a logo, and every reference to it, gets the logo's own prefix (nn-logo-full-head,
// nn-logo-mono-mono-ink, ...), so a page can inline several logos and the mascot files together
// without two elements sharing an id.
const prefixIds = (svg, name) =>
  svg
    .replace(/ id="([^"]+)"/g, ` id="nn-${name}-$1"`)
    .replace(/href="#([^"]+)"/g, `href="#nn-${name}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#nn-${name}-$1)`);

const wrap = (viewBox, content) => `<svg xmlns="${XMLNS}" viewBox="${viewBox}">\n${content}</svg>\n`;
const frame = (content, square = false) => wrap(frameViewBox(content, square), content);

const elements = (node) => node.children.filter((child) => child.type === 'element');

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

const same = (a, b) => a !== undefined && b !== undefined && a.toLowerCase() === b.toLowerCase();

// Head only, for the icon: the Vàng rơm hat lifted to Trắng gạo, without id, data-pivot and style.
function simplifyHead(node) {
  const copy = { ...node, attributes: { ...node.attributes }, children: elements(node).map(simplifyHead) };
  delete copy.attributes['data-pivot'];
  delete copy.attributes.style;
  delete copy.attributes.id;
  if (same(node.attributes.fill, ICON_DISC)) copy.attributes.fill = ICON_DISC_LIFT;
  return copy;
}

function iconLogo(headFull) {
  const rootPaint = inheritedRoot(headFull);
  const head = simplifyHead(findById(headFull, 'head'));
  const drawing = `<g${attrs(rootPaint)}>\n${stringify(head)}\n</g>\n`;
  const box = paintedBox(drawing);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = (ICON_DISC_SCALE * Math.max(box.width, box.height)) / 2;
  return frame(`<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" fill="${ICON_DISC}"/>\n${drawing}`, true);
}

// ---------- mono ----------

const INK = '#FFFFFF';
// Colors that print as ink in the one-color logo: the outlines and the black hair. In the light
// version (light ink on a dark background) the hair is paper, so it shows the dark background like
// the real hair, inside its Nâu đất outline, which stays ink.
const INK_TOKENS = ['nau-dat', 'toc'];
const LIGHT_INK_TOKENS = ['nau-dat'];
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

function monoColor(value, where, inkColors) {
  if (value === 'none') return value;
  const hex = value.toLowerCase();
  if (inkColors.includes(hex)) return INK;
  if (Object.values(tokens.color).some((c) => c.value.toLowerCase() === hex)) return PAPER;
  throw new Error(`logo-mono: ${where} has color "${value}", not a palette color`);
}

// Copy of one mascot node for the mask: the ink colors become ink (white), every other palette color
// becomes paper (black), geometry stays. Anything else throws, so a redrawn mascot cannot lose
// something silently: opacity has no one-color form, and unknown attributes or elements may paint.
function monoNode(node, keepIds, inkColors) {
  const where = `<${node.name}${node.attributes.id ? ` id="${node.attributes.id}"` : ''}>`;
  if (!MONO_SHAPES.has(node.name)) throw new Error(`logo-mono: unsupported element ${where}`);
  const attributes = {};
  for (const [key, value] of Object.entries(node.attributes)) {
    if (key === 'fill' || key === 'stroke') attributes[key] = monoColor(value, `${where} ${key}`, inkColors);
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
    if (child.type === 'element') return monoNode(child, keepIds || node.name === 'defs', inkColors);
    if (child.type === 'text' && child.value.trim() !== '') throw new Error(`logo-mono: text inside ${where}`);
    return null;
  });
  return { ...node, attributes, children: children.filter((child) => child !== null) };
}

// One-color mascot. The mask repaints the mascot in paint order with two tones, so whatever a color
// shape covers in the color mascot stays covered: the hair stays solid around an empty face, and
// lines under the hands, grains and sleeves stay hidden. One Nâu đất rectangle shows through the
// ink. The mask region is the 512 x 512 canvas, which also cuts the bust at its bottom edge.
export function monoMascot(source, ink = 'nau-dat', inkTokens = INK_TOKENS) {
  const mascot = parseSync(source);
  const { xmlns, viewBox, ...rootPaint } = mascot.attributes;
  const inkColors = inkTokens.map((token) => color(token).toLowerCase());
  const root = monoNode({ ...mascot, name: 'g', attributes: rootPaint }, false, inkColors);
  const [, , width, height] = viewBox.trim().split(/[\s,]+/);
  return (
    `<defs>\n<mask id="mono-ink" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">\n` +
    `${stringify(root)}\n</mask>\n</defs>\n` +
    `<svg x="0" y="0" width="${MASCOT_SIZE}" height="${MASCOT_SIZE}" viewBox="${viewBox}">\n` +
    `<rect width="${width}" height="${height}" fill="${color(ink)}" mask="url(#mono-ink)"/>\n</svg>\n`
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

// The Trắng gạo border behind the mascot: its silhouette as drawn in the logo (clipped at the 512
// canvas), gaps closed, grown by STICKER_WIDTH.
function sticker(mascotSvg) {
  const drawn = `<svg xmlns="${XMLNS}" viewBox="0 0 ${MASCOT_SIZE} ${MASCOT_SIZE}">${mascotSvg}</svg>`;
  const box = [-STICKER_PAD, -STICKER_PAD, MASCOT_SIZE + 2 * STICKER_PAD, MASCOT_SIZE + 2 * STICKER_PAD];
  const pathData = stickerPath(drawn, box, { close: STICKER_CLOSE, width: STICKER_WIDTH });
  return `<path d="${pathData}" fill="${color(STICKER)}"/>\n`;
}

export function buildLogos() {
  const words = wordmark();
  const mascot = fullMascot(parseSync(readFileSync(mascotPath, 'utf8')));
  const viewBox = logoFrame(words);
  const logoMascot = readFileSync(logoMascotPath, 'utf8');
  const fullLight = sticker(mascot) + mascot + wordmark(LIGHT_TITLE, LIGHT_TAGLINE);
  const logos = {
    'logo-full.svg': wrap(viewBox, mascot + words),
    'logo-full-light.svg': frame(fullLight),
    'logo-icon.svg': iconLogo(parseSync(readFileSync(logoMascotHeadPath, 'utf8'))),
    'logo-mono.svg': wrap(viewBox, monoMascot(logoMascot) + wordmark('nau-dat', 'nau-dat')),
    'logo-mono-light.svg': wrap(viewBox, monoMascot(logoMascot, LIGHT_INK, LIGHT_INK_TOKENS) + wordmark(LIGHT_INK, LIGHT_INK)),
  };
  return Object.fromEntries(Object.entries(logos).map(([file, svg]) => [file, prefixIds(svg, file.replace(/\.svg$/, ''))]));
}

if (isDirectRun(import.meta.url)) {
  mkdirSync(logoDir, { recursive: true });
  for (const [file, svg] of Object.entries(buildLogos())) {
    writeFileSync(logoDir + file, svg);
    console.log(`wrote brand/logo/${file} (${Buffer.byteLength(svg)} bytes)`);
  }
}
