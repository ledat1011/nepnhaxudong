'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { build } = require('../lib/build');
const { findBrowser } = require('../lib/render');
const { need } = require('../lib/gif/packages');

process.env.EXCALIDRAW_SNAPSHOT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-gif-test-'));

const hasBrowser = (() => { try { findBrowser(); return true; } catch (e) { return false; } })();
const hasPackages = (() => { try { need('gifenc'); need('@napi-rs/canvas'); return true; } catch (e) { return false; } })();
const skip = !hasBrowser || !hasPackages || process.env.EXCALIDRAW_OFFLINE === '1';

const EXAMPLE = path.join(__dirname, '..', 'examples', 'gif', 'order-flow');
const ANIMATE = path.join(__dirname, '..', 'lib', 'gif', 'animate.js');

test('the order-flow example builds and animates', { skip, timeout: 600000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gif-animate-test-'));
  for (const f of ['order-flow.diagram.js', 'order-flow.anim.js']) fs.copyFileSync(path.join(EXAMPLE, f), path.join(dir, f));
  const out = path.join(dir, 'out');
  const [r] = await build({ script: path.join(dir, 'order-flow.diagram.js'), out, scale: 1 });
  assert.deepEqual(r.report.errors, []);
  assert.equal(r.anim, path.join(out, 'order-flow.anim.js'));

  const printed = execFileSync(process.execPath, [ANIMATE, r.anim, '--preview', '2'], { encoding: 'utf8' });
  const preview = (printed.match(/^preview (.+)$/m) || [])[1];
  assert.ok(preview && fs.existsSync(preview.trim()), printed);
  assert.match(preview, /excalidraw-gif/);
});
