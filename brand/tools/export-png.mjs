// Renders brand/logo/logo-icon.svg into brand/png/logo-icon-{32,192,512}.png.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { isDirectRun } from './lib/run.mjs';

const iconSvgPath = fileURLToPath(new URL('../logo/logo-icon.svg', import.meta.url));
const pngDir = fileURLToPath(new URL('../png/', import.meta.url));

export const ICON_SIZES = [32, 192, 512];

export const iconPngPath = (size) => `${pngDir}logo-icon-${size}.png`;

export function renderIconPng(svgString, size) {
  return new Resvg(svgString, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

if (isDirectRun(import.meta.url)) {
  const svg = readFileSync(iconSvgPath, 'utf8');
  mkdirSync(pngDir, { recursive: true });
  for (const size of ICON_SIZES) {
    const png = renderIconPng(svg, size);
    writeFileSync(iconPngPath(size), png);
    console.log(`logo-icon-${size}.png ${png.length} bytes`);
  }
}
