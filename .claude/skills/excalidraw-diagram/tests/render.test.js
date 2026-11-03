'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const kit = require('../lib/kit');
const { render, findBrowser, pageHtml } = require('../lib/render');

const hasBrowser = (() => { try { findBrowser(); return true; } catch (e) { return false; } })();
const skip = !hasBrowser || process.env.EXCALIDRAW_OFFLINE === '1';

test('EXCALIDRAW_BROWSER overrides the browser search', () => {
  const saved = process.env.EXCALIDRAW_BROWSER;
  try {
    process.env.EXCALIDRAW_BROWSER = process.execPath;
    assert.equal(findBrowser(), process.execPath);
    process.env.EXCALIDRAW_BROWSER = path.join(os.tmpdir(), 'no-such-browser.exe');
    assert.throws(() => findBrowser(), /EXCALIDRAW_BROWSER points to a missing file/);
  } finally {
    if (saved === undefined) delete process.env.EXCALIDRAW_BROWSER; else process.env.EXCALIDRAW_BROWSER = saved;
  }
});

test('the browser list covers Windows, macOS and Linux', () => {
  const { browserCandidates } = require('../lib/render');
  assert.ok(browserCandidates('win32').some(p => /msedge\.exe$/.test(p)));
  assert.ok(browserCandidates('darwin').some(p => /Google Chrome\.app/.test(p)));
  assert.ok(browserCandidates('linux').some(p => /chromium|google-chrome|microsoft-edge/.test(p)));
});

test('pageHtml escapes "<" so diagram text cannot close the script block', () => {
  const html = pageHtml({ elements: [{ type: 'text', text: '</script><b>x' }], appState: {}, files: {} });
  assert.ok(!html.includes('</script><b>'));
  assert.ok(html.includes('\\u003c/script>'));
});

test('renders a scene to a PNG of the reported size', { skip, timeout: 240000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-test-'));
  const d = kit.createDiagram();
  const a = d.card({ x: 0, y: 0, label: 'A' });
  const b = d.card({ x: 400, y: 0, label: 'B' });
  d.link(a, 'r', b, 'l');
  const file = d.save(path.join(dir, 'tiny.excalidraw'));
  const r = await render(file, path.join(dir, 'tiny.png'), { scale: 1 });
  const buf = fs.readFileSync(r.file);
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(buf.readUInt32BE(16), r.width);
  assert.equal(buf.readUInt32BE(20), r.height);
  assert.ok(r.width >= 640 + 60, `width ${r.width}`);
  assert.equal(r.textWidths.length, 2);
});
