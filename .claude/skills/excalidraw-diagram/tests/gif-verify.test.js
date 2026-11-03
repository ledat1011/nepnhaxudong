'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { need } = require('../lib/gif/packages');

const hasPackages = (() => { try { need('gifenc'); need('omggif'); need('@napi-rs/canvas'); return true; } catch (e) { return false; } })();
const VERIFY = path.join(__dirname, '..', 'lib', 'gif', 'verify.js');

test('a missing GIF package says how to install it', () => {
  assert.throws(() => need('no-such-gif-package'), e =>
    /GIF packages are missing \(no-such-gif-package\)/.test(e.message) && /npm ci --prefix "/.test(e.message));
});

// a 1200 px wide GIF of 3 identical white frames; `repeat` 0 = loop forever, -1 = play once
function writeGif(file, repeat) {
  const { GIFEncoder } = need('gifenc');
  const W = 1200;
  const H = 40;
  const gif = GIFEncoder();
  const idx = new Uint8Array(W * H);
  for (let f = 0; f < 3; f++) gif.writeFrame(idx, W, H, { palette: [[255, 255, 255], [0, 0, 0]], delay: 40, repeat });
  gif.finish();
  fs.writeFileSync(file, gif.bytes());
}

function verify(file) {
  try {
    return { code: 0, out: execFileSync(process.execPath, [VERIFY, file], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status, out: e.stdout };
  }
}

test('verify passes a GIF that loops forever', { skip: !hasPackages }, () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gif-verify-test-')), 'loops.gif');
  writeGif(file, 0);
  const r = verify(file);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /PASS loops forever/);
});

test('verify warns about a GIF that plays only once', { skip: !hasPackages }, () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gif-verify-test-')), 'once.gif');
  writeGif(file, -1);
  const r = verify(file);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /WARN loops/);
});
