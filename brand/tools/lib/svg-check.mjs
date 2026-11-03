import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { parseSync, stringify } from 'svgson';

const tokensPath = fileURLToPath(new URL('../../tokens/tokens.json', import.meta.url));

function channelToLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channelToLinear(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG 2.x contrast ratio between two #RRGGBB colors (1 to 21).
export function contrast(hexA, hexB) {
  const [light, dark] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// Lowercase hex codes of every color in brand/tokens/tokens.json.
export function palette() {
  const { color } = JSON.parse(readFileSync(tokensPath, 'utf8'));
  return new Set(Object.values(color).map((c) => c.value.toLowerCase()));
}

const IGNORED_COLORS = new Set(['none', 'currentcolor', 'transparent']);
const COLOR_PROPS = ['fill', 'stroke', 'stop-color'];

function normalizeColor(value) {
  const v = value.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(v);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : v;
}

function styleColors(style) {
  return style
    .split(';')
    .map((decl) => decl.split(':'))
    .filter(([prop, value]) => value !== undefined && COLOR_PROPS.includes(prop.trim().toLowerCase()))
    .map(([, value]) => value);
}

// Facts about one SVG file for the brand checks: viewBox, ids in document order,
// every fill/stroke/stop-color (lowercase, short hex expanded), element names, hrefs and size,
// the direct children of the root (topLevel) and, per id, its tag, attributes and the ids of its ancestors.
export function svgFacts(path) {
  const source = readFileSync(path, 'utf8');
  const facts = {
    viewBox: null,
    ids: [],
    colors: new Set(),
    tags: new Set(),
    hrefs: [],
    bytes: statSync(path).size,
    topLevel: [],
    elements: {},
  };
  const visit = (node, ancestors) => {
    if (node.type !== 'element') return;
    const { name, attributes } = node;
    facts.tags.add(name);
    if (name === 'svg' && facts.viewBox === null && attributes.viewBox !== undefined) facts.viewBox = attributes.viewBox;
    if (attributes.id !== undefined) {
      facts.ids.push({ tag: name, id: attributes.id });
      facts.elements[attributes.id] = { tag: name, attributes, ancestors };
    }
    const raw = COLOR_PROPS.map((prop) => attributes[prop]).filter((v) => v !== undefined);
    if (attributes.style !== undefined) raw.push(...styleColors(attributes.style));
    for (const color of raw.map(normalizeColor)) {
      if (!IGNORED_COLORS.has(color)) facts.colors.add(color);
    }
    for (const key of ['href', 'xlink:href']) {
      if (attributes[key] !== undefined) facts.hrefs.push(attributes[key]);
    }
    const inner = attributes.id !== undefined && node !== root ? [...ancestors, attributes.id] : ancestors;
    node.children.forEach((child) => visit(child, inner));
  };
  const root = parseSync(source);
  facts.topLevel = elementChildren(root).map((child) => ({ tag: child.name, id: child.attributes.id }));
  visit(root, []);
  return facts;
}

const elementChildren = (node) => node.children.filter((child) => child.type === 'element');

function findPath(node, id) {
  if (node.attributes?.id === id) return [node];
  for (const child of elementChildren(node)) {
    const path = findPath(child, id);
    if (path) return [node, ...path];
  }
  return null;
}

// Bounding box of the drawn content (strokes included) in viewBox units, measured by resvg.
// With an id, every element that is not on the way to that element (or inside it) is hidden;
// <defs> stay so that <use> references still resolve.
export function contentBBox(svgString, id) {
  let source = svgString;
  if (id !== undefined) {
    const root = parseSync(svgString);
    const path = findPath(root, id);
    if (path === null) throw new Error(`no element with id "${id}"`);
    for (let i = 0; i < path.length - 1; i++) {
      for (const sibling of elementChildren(path[i])) {
        if (sibling !== path[i + 1] && sibling.name !== 'defs') sibling.attributes.display = 'none';
      }
    }
    source = stringify(root);
  }
  const box = new Resvg(source).getBBox();
  if (box === undefined) throw new Error(`nothing drawn${id === undefined ? '' : ` in "${id}"`}`);
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

const VISIBLE_PAD = 0.5;
const VISIBLE_MAX_PIXELS = 1024;
const VISIBLE_MAX_SCALE = 4;

// Bounding box of what is really painted, in viewBox units: clip paths and nested <svg> viewports
// cut it (contentBBox ignores both), and content past the root viewBox still counts (up to half the
// viewBox size on each side). It is read from the alpha channel of a resvg render, rounded outward
// to the pixel grid (at most 1 unit). resvg's own innerBBox() is not used: it reports strokes far
// past a sharp corner even with round joins.
export function visibleBBox(svgString) {
  const root = parseSync(svgString);
  const [x, y, width, height] = root.attributes.viewBox.trim().split(/[\s,]+/).map(Number);
  const [left, top] = [x - VISIBLE_PAD * width, y - VISIBLE_PAD * height];
  const [fullWidth, fullHeight] = [(1 + 2 * VISIBLE_PAD) * width, (1 + 2 * VISIBLE_PAD) * height];
  const scale = Math.min(VISIBLE_MAX_SCALE, VISIBLE_MAX_PIXELS / Math.max(fullWidth, fullHeight));
  root.attributes.viewBox = `${left} ${top} ${fullWidth} ${fullHeight}`;
  root.attributes.width = String(Math.round(fullWidth * scale));
  root.attributes.height = String(Math.round(fullHeight * scale));
  const image = new Resvg(stringify(root)).render();
  const { pixels } = image;
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -1, -1];
  for (let py = 0; py < image.height; py++) {
    for (let px = 0; px < image.width; px++) {
      if (pixels[(py * image.width + px) * 4 + 3] === 0) continue;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
  }
  if (maxX < 0) throw new Error('nothing drawn');
  const unit = fullWidth / image.width;
  return {
    x: left + minX * unit,
    y: top + minY * unit,
    width: (maxX + 1 - minX) * unit,
    height: (maxY + 1 - minY) * unit,
  };
}

// Copy of the SVG where each group in angles ({ id: degrees }) gets transform="rotate(deg x y)"
// around its data-pivot. resvg ignores CSS transform-origin, so the pivot goes into rotate().
export function rotateGroups(svgString, angles) {
  const root = parseSync(svgString);
  for (const [id, degrees] of Object.entries(angles)) {
    const path = findPath(root, id);
    if (path === null) throw new Error(`no element with id "${id}"`);
    const node = path[path.length - 1];
    const [x, y] = node.attributes['data-pivot'].split(' ');
    node.attributes.transform = `rotate(${degrees} ${x} ${y})`;
  }
  return stringify(root);
}
