'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { build } = require('../lib/build');
const { findBrowser } = require('../lib/render');
const { snapshotPath } = require('../lib/save');

process.env.EXCALIDRAW_SNAPSHOT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-build-test-'));

const hasBrowser = (() => { try { findBrowser(); return true; } catch (e) { return false; } })();
const skip = !hasBrowser || process.env.EXCALIDRAW_OFFLINE === '1';

const SCRIPT = `module.exports = kit => {
  const d = kit.createDiagram();
  const a = d.card({ x: 0, y: 0, label: 'A' });
  const b = d.card({ x: 400, y: 0, label: 'B' });
  d.link(a, 'r', b, 'l');
  return [{ slug: 'tiny-flow', diagram: d }];
};
`;

test('a script that does not export a function is rejected', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-test-'));
  const script = path.join(dir, 'bad.diagram.js');
  fs.writeFileSync(script, 'module.exports = 42;');
  await assert.rejects(build({ script, out: dir }), /must export a function/);
});

test('build writes .excalidraw, .png and the script, keeps its own slug, and moves to -v2 after a hand edit',
  { skip, timeout: 600000 }, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-test-'));
    const script = path.join(dir, 'tiny.diagram.js');
    fs.writeFileSync(script, SCRIPT);
    fs.writeFileSync(path.join(dir, 'tiny-flow.anim.js'), 'module.exports = a => {};\n');
    const out = path.join(dir, 'out');

    const [r] = await build({ script, out, scale: 1 });
    assert.equal(r.slug, 'tiny-flow');
    assert.ok(fs.existsSync(r.excalidraw));
    assert.ok(fs.existsSync(r.png));
    assert.equal(r.script, path.join(out, 'tiny.diagram.js'));
    assert.ok(fs.existsSync(r.script));
    assert.deepEqual(r.report.errors, []);
    assert.equal(r.embed, '![[tiny-flow.png]]');
    assert.equal(r.anim, path.join(out, 'tiny-flow.anim.js'), 'the .anim.js next to the script is copied with it');
    assert.ok(fs.existsSync(r.anim));

    assert.ok(fs.existsSync(snapshotPath(r.excalidraw)), 'build stores a snapshot of what it wrote');

    // opening the file in an editor only re-saves it: not a hand edit
    const later = new Date(Date.now() + 5000);
    fs.utimesSync(r.excalidraw, later, later);
    const [again] = await build({ script, out, scale: 1 });
    assert.equal(again.slug, 'tiny-flow');

    // a real hand edit: a component moved
    const scene = JSON.parse(fs.readFileSync(r.excalidraw, 'utf8'));
    scene.elements.find(e => e.customData && e.customData.kit === 'component').x += 50;
    fs.writeFileSync(r.excalidraw, JSON.stringify(scene));
    const [edited] = await build({ script, out, scale: 1 });
    assert.equal(edited.slug, 'tiny-flow-v2');
    assert.equal(edited.anim, path.join(out, 'tiny-flow-v2.anim.js'), 'the .anim.js follows the -v2 slug');
    assert.ok(fs.existsSync(edited.anim));

    // the user said the edited file may be replaced
    const [replaced] = await build({ script, out, scale: 1, overwrite: true });
    assert.equal(replaced.slug, 'tiny-flow');
  });

test('an error thrown inside a script names the script and keeps its stack line', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-test-'));
  const script = path.join(dir, 'boom.diagram.js');
  fs.writeFileSync(script, "module.exports = kit => {\n  throw new TypeError('bad thing');\n};\n");
  await assert.rejects(build({ script, out: dir }), e => {
    assert.match(e.message, /boom\.diagram\.js/);
    assert.match(e.message, /bad thing/);
    assert.match(e.stack, /boom\.diagram\.js:2/);
    return true;
  });
});

test('a syntax error in a script names the script', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-test-'));
  const script = path.join(dir, 'syntax.diagram.js');
  fs.writeFileSync(script, 'module.exports = kit => {{;\n');
  await assert.rejects(build({ script, out: dir }), e => {
    assert.match(e.message, /syntax\.diagram\.js/);
    assert.match(e.stack, /syntax\.diagram\.js/);
    return true;
  });
});
