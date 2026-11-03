import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSync } from 'svgson';

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
// every fill/stroke/stop-color (lowercase, short hex expanded), element names, hrefs and size.
export function svgFacts(path) {
  const source = readFileSync(path, 'utf8');
  const facts = { viewBox: null, ids: [], colors: new Set(), tags: new Set(), hrefs: [], bytes: statSync(path).size };
  const visit = (node) => {
    if (node.type !== 'element') return;
    const { name, attributes } = node;
    facts.tags.add(name);
    if (name === 'svg' && facts.viewBox === null && attributes.viewBox !== undefined) facts.viewBox = attributes.viewBox;
    if (attributes.id !== undefined) facts.ids.push({ tag: name, id: attributes.id });
    const raw = COLOR_PROPS.map((prop) => attributes[prop]).filter((v) => v !== undefined);
    if (attributes.style !== undefined) raw.push(...styleColors(attributes.style));
    for (const color of raw.map(normalizeColor)) {
      if (!IGNORED_COLORS.has(color)) facts.colors.add(color);
    }
    for (const key of ['href', 'xlink:href']) {
      if (attributes[key] !== undefined) facts.hrefs.push(attributes[key]);
    }
    node.children.forEach(visit);
  };
  visit(parseSync(source));
  return facts;
}
