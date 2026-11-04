// Renders brand/concepts/concept-{1..6}.svg into one 3 x 2 contact sheet, concepts.png.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import { isDirectRun } from './lib/run.mjs';

const conceptsDir = fileURLToPath(new URL('../concepts/', import.meta.url));
const fontPath = fileURLToPath(new URL('../fonts/Quicksand-700.ttf', import.meta.url));
const tokens = JSON.parse(readFileSync(fileURLToPath(new URL('../tokens/tokens.json', import.meta.url)), 'utf8'));
const color = (name) => tokens.color[name].value;

const CELL = 400;
const COLUMNS = 3;
const ROWS = 2;
const LABEL_RADIUS = 22;
const LABEL_SIZE = 30;
const LABEL_INSET = 34;

const fontBuffer = readFileSync(fontPath);
const font = opentype.parse(fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength));

// Every concept defines the same ids (for example #gr), so each one gets its own prefix.
function inlineConcept(n, x, y) {
  const source = readFileSync(`${conceptsDir}concept-${n}.svg`, 'utf8');
  const prefix = `c${n}-`;
  const prefixed = source
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
  return prefixed.replace('<svg ', `<svg x="${x}" y="${y}" width="${CELL}" height="${CELL}" `);
}

function label(n, x, y) {
  const cx = x + LABEL_INSET;
  const cy = y + LABEL_INSET;
  const text = String(n);
  const width = font.getAdvanceWidth(text, LABEL_SIZE);
  const digit = font.getPath(text, cx - width / 2, cy + LABEL_SIZE * 0.36, LABEL_SIZE).toPathData(1);
  return `<circle cx="${cx}" cy="${cy}" r="${LABEL_RADIUS}" fill="${color('nau-dat')}"/><path d="${digit}" fill="${color('trang-gao')}"/>`;
}

const width = CELL * COLUMNS;
const height = CELL * ROWS;
export const conceptsPngPath = `${conceptsDir}concepts.png`;

export function renderConceptsPng() {
  let cells = '';
  for (let i = 0; i < COLUMNS * ROWS; i++) {
    const x = (i % COLUMNS) * CELL;
    const y = Math.floor(i / COLUMNS) * CELL;
    cells += inlineConcept(i + 1, x, y) + label(i + 1, x, y);
  }
  const grid = `M${CELL} 0V${height}M${2 * CELL} 0V${height}M0 ${CELL}H${width}`;
  const sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${color('trang-gao')}"/>` +
    `<path d="${grid}" stroke="${color('vang-rom')}" stroke-width="2"/>` +
    cells +
    `</svg>`;
  return new Resvg(sheet).render().asPng();
}

if (isDirectRun(import.meta.url)) {
  const png = renderConceptsPng();
  writeFileSync(conceptsPngPath, png);
  console.log(`concepts.png ${width}x${height}, ${png.length} bytes`);
}
