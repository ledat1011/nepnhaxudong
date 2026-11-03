'use strict';
// Decodes a GIF with an independent decoder (omggif), checks it and writes a contact sheet of evenly spaced frames
// (to the temp folder), so the whole animation can be reviewed in one image.
// Prints one PASS / WARN line per check and exits 1 when any check is WARN.
// usage: node lib/gif/verify.js <file.gif> [--frames 8] [--at 12,150]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { need } = require('./packages');

let GifReader;
let createCanvas;
try {
  ({ GifReader } = need('omggif'));
  ({ createCanvas } = need('@napi-rs/canvas'));
} catch (e) {
  console.error(`ERROR ${e.message}`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const file = argv.find(a => a.endsWith('.gif'));
if (!file) {
  console.error('usage: node lib/gif/verify.js <file.gif> [--frames 8] [--at 12,150]');
  process.exit(2);
}
const opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const COLS = 2;
const THUMB_W = 800;
const MAX_MB = 3;          // chat, PR and wiki pages take it without trouble
const MIN_WIDTH = 1200;    // below this the diagram's smallest text gets hard to read
const SEAM_LIMIT = 0.001;  // share of pixels the last frame may differ from the first (seamless loop)

const r = new GifReader(fs.readFileSync(file));
const n = r.numFrames();
const count = Number(opt('--frames') || 8);
const wanted = opt('--at')
  ? opt('--at').split(',').map(Number)
  : Array.from({ length: count }, (_, i) => Math.round(i * (n - 1) / (count - 1)));
const rgba = new Uint8ClampedArray(r.width * r.height * 4);
const full = createCanvas(r.width, r.height);
const fctx = full.getContext('2d');
const thumbH = Math.round(r.height * THUMB_W / r.width);
const rows = Math.ceil(wanted.length / COLS);
const sheet = createCanvas(COLS * THUMB_W, rows * (thumbH + 28));
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#ffffff';
sctx.fillRect(0, 0, sheet.width, sheet.height);

let total = 0;
let placed = 0;
let first = null;
for (let f = 0; f < n; f++) {
  const info = r.frameInfo(f);
  total += info.delay;
  r.decodeAndBlitFrameRGBA(f, rgba);   // composes on top of the previous frame, like a browser does
  if (f === 0) first = new Uint8ClampedArray(rgba);
  if (!wanted.includes(f)) continue;
  const img = fctx.createImageData(r.width, r.height);
  img.data.set(rgba);
  fctx.putImageData(img, 0, 0);
  const x = (placed % COLS) * THUMB_W;
  const y = Math.floor(placed / COLS) * (thumbH + 28);
  sctx.drawImage(full, x, y + 28, THUMB_W, thumbH);
  sctx.fillStyle = '#c92a2a';
  sctx.font = 'bold 18px Arial';
  sctx.fillText(`frame ${f} · ${(total / 100).toFixed(2)} s`, x + 8, y + 20);
  placed++;
}
let differ = 0;
for (let i = 0; i < rgba.length; i += 4) {
  if (rgba[i] !== first[i] || rgba[i + 1] !== first[i + 1] || rgba[i + 2] !== first[i + 2]) differ++;
}

const dir = path.join(os.tmpdir(), 'excalidraw-gif', path.basename(file, '.gif'));
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, 'sheet.png');
fs.writeFileSync(out, sheet.toBuffer('image/png'));
const mb = fs.statSync(file).size / 1048576;
const seam = differ / (r.width * r.height);
const checks = [
  [mb <= MAX_MB, `size ${mb.toFixed(1)} MB (max ${MAX_MB})`],
  [r.width >= MIN_WIDTH, `width ${r.width} px (min ${MIN_WIDTH})`],
  [r.loopCount() === 0, `loops ${r.loopCount() === 0 ? 'forever' : `${r.loopCount()} times`}`],
  [seam <= SEAM_LIMIT, `seamless loop: last frame differs from the first in ${(seam * 100).toFixed(2)} % of pixels`],
];
console.log(`${path.basename(file)} · ${r.width}x${r.height} · ${n} frames · ${(total / 100).toFixed(2)} s`);
checks.forEach(([ok, text]) => console.log(`${ok ? 'PASS' : 'WARN'} ${text}`));
console.log(`sheet ${out}`);
process.exit(checks.every(([ok]) => ok) ? 0 : 1);
