import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ICON_SIZES, iconPngPath, renderIconPng } from '../export-png.mjs';
import { buildPreview } from '../build-preview.mjs';

const brandDir = fileURLToPath(new URL('../../', import.meta.url));
const iconSvgPath = `${brandDir}logo/logo-icon.svg`;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Width and height from the IHDR chunk, which always comes right after the 8-byte signature.
function pngSize(buffer) {
  assert.deepEqual(buffer.subarray(0, 8), PNG_SIGNATURE, 'not a PNG file');
  assert.equal(buffer.toString('latin1', 12, 16), 'IHDR');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('png dung kich thuoc', () => {
  assert.deepEqual(ICON_SIZES, [32, 192, 512]);
  for (const size of ICON_SIZES) {
    assert.deepEqual(pngSize(readFileSync(iconPngPath(size))), { width: size, height: size }, `logo-icon-${size}.png`);
  }
});

test('png moi hon logo-icon.svg', () => {
  const svg = readFileSync(iconSvgPath, 'utf8');
  for (const size of ICON_SIZES) {
    const fresh = renderIconPng(svg, size);
    assert.ok(readFileSync(iconPngPath(size)).equals(fresh), `logo-icon-${size}.png is stale: run npm run png`);
  }
});

// git with core.autocrlf may check preview.html out with CRLF line endings.
const lf = (text) => text.replace(/\r\n/g, '\n');

test('preview.html moi hon mascot va tokens', () => {
  const current = readFileSync(`${brandDir}preview.html`, 'utf8');
  assert.equal(lf(current), lf(buildPreview()), 'preview.html is stale: run npm run preview');
});

test('preview: mascot nhung truc tiep, xoay quanh data-pivot, tat khi giam chuyen dong', () => {
  const html = buildPreview();
  const mascot = readFileSync(`${brandDir}mascot/mascot-layered.svg`, 'utf8');
  for (const id of ['head', 'rice']) {
    const [, x, y] = new RegExp(`id="${id}"[^>]*data-pivot="([\\d.]+) ([\\d.]+)"`).exec(mascot);
    assert.match(html, new RegExp(`id="${id}"[^>]*transform-origin: ${x}px ${y}px`), id);
  }
  assert.match(html, /transform-box: view-box/);
  for (const [id, degrees] of [['head', 3], ['rice', 6]]) {
    const sway = `@keyframes ${id}-sway \\{\\s*from \\{ transform: rotate\\(-${degrees}deg\\); \\}\\s*to \\{ transform: rotate\\(${degrees}deg\\); \\}`;
    assert.match(html, new RegExp(sway), `${id} sways ±${degrees}°`);
    assert.match(html, new RegExp(`\\.mascot #${id} \\{ animation: ${id}-sway `), `${id} animated`);
  }
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(html, /<script|https?:\/\/(?!www\.w3\.org)/, 'no script, no external resource');
});

test('preview: 3 logo tren 3 nen (ban sang tren Nau dat), icon 4 co, cap chu / nen co ty le tuong phan', () => {
  const html = buildPreview();
  const count = (name) => html.split(`src="logo/${name}.svg"`).length - 1;
  assert.ok(count('logo-icon') >= 3, 'logo-icon on 3 backgrounds');
  for (const name of ['logo-full', 'logo-mono']) {
    assert.equal(count(name), 2, `${name} on the 2 light backgrounds`);
    assert.equal(count(`${name}-light`), 1, `${name}-light on Nau dat`);
  }
  const dark = html.slice(html.indexOf('background: var(--color-nau-dat)'));
  assert.match(dark.slice(0, dark.indexOf('</div>\n      </div>')), /logo-full-light\.svg[\s\S]*logo-mono-light\.svg/, 'light logos on Nau dat');
  for (const background of ['trang-gao', 'vang-rom', 'nau-dat']) {
    assert.match(html, new RegExp(`var\\(--color-${background}\\)`), background);
  }
  for (const size of [16, 32, 64, 192]) {
    assert.match(html, new RegExp(`src="logo/logo-icon.svg" width="${size}" height="${size}"`), `icon ${size}`);
  }
  const { textPairs } = JSON.parse(readFileSync(`${brandDir}tokens/tokens.json`, 'utf8'));
  assert.equal(html.match(/class="pair"/g).length, textPairs.length);
  assert.match(html, /\d+,\d+ : 1/);
});
