'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { outputPaths } = require('../lib/save');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'save-test-'));
const touch = (file, secondsAgo) => {
  fs.writeFileSync(file, 'x');
  const t = new Date(Date.now() - secondsAgo * 1000);
  fs.utimesSync(file, t, t);
};

test('a new slug keeps its name', () => {
  const dir = tmp();
  const p = outputPaths(dir, 'story-publish-sequence');
  assert.equal(p.slug, 'story-publish-sequence');
  assert.equal(p.excalidraw, path.join(dir, 'story-publish-sequence.excalidraw'));
  assert.equal(p.png, path.join(dir, 'story-publish-sequence.png'));
  assert.equal(p.embed, '![[story-publish-sequence.png]]');
});

test("Claude's own last write (PNG newer) is overwritten", () => {
  const dir = tmp();
  touch(path.join(dir, 'flow.excalidraw'), 20);
  touch(path.join(dir, 'flow.png'), 10);
  assert.equal(outputPaths(dir, 'flow').slug, 'flow');
});

test('a hand edit (.excalidraw newer than the PNG) sends the new version to -v2', () => {
  const dir = tmp();
  touch(path.join(dir, 'flow.png'), 10);
  touch(path.join(dir, 'flow.excalidraw'), 5);
  assert.equal(outputPaths(dir, 'flow').slug, 'flow-v2');
});

test('an .excalidraw without a PNG counts as hand-made', () => {
  const dir = tmp();
  touch(path.join(dir, 'flow.excalidraw'), 5);
  assert.equal(outputPaths(dir, 'flow').slug, 'flow-v2');
});

test('a hand-edited -v2 moves on to -v3', () => {
  const dir = tmp();
  touch(path.join(dir, 'flow.excalidraw'), 5);
  touch(path.join(dir, 'flow-v2.png'), 10);
  touch(path.join(dir, 'flow-v2.excalidraw'), 5);
  assert.equal(outputPaths(dir, 'flow').slug, 'flow-v3');
});

test('a slug that is not kebab-case throws', () => {
  assert.throws(() => outputPaths(tmp(), 'My Flow'), /kebab-case/);
});

// ---- hand edits are judged by content when a snapshot of Claude's last build exists ----
const kit = require('../lib/kit');
const { sceneEdited, editedByHand, writeSnapshot } = require('../lib/save');
process.env.EXCALIDRAW_SNAPSHOT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-test-'));

const sampleScene = () => {
  const d = kit.createDiagram();
  const a = d.serverStack({ x: 0, y: 100, label: 'Producer', note: 'a note' });
  const b = d.card({ x: 0, y: 500, label: 'Consumer' });
  d.link(a, 'b', b, 't');
  d.note({ x: 400, y: 100, w: 300, text: 'centered words', align: 'center' });
  return JSON.parse(JSON.stringify(d.scene()));
};

test('an unchanged scene is not a hand edit', () => {
  assert.equal(sceneEdited(sampleScene(), sampleScene()), false);
});

test('what an editor changes on open is not a hand edit (re-snapped arrow, re-measured text, new versions)', () => {
  const built = sampleScene();
  const opened = sampleScene();
  for (const e of opened.elements) {
    e.version += 3;
    e.versionNonce += 1;
    if (e.type === 'arrow') e.points = e.points.map(([x, y]) => [x + 7, y - 9]);
    if (e.type === 'text' && e.textAlign === 'center') { e.x += 6; e.width -= 12; }
    if (e.type === 'text' && e.textAlign !== 'center') e.width -= 15;
  }
  assert.equal(sceneEdited(opened, built), false);
});

test('a moved component, a changed text or an added / removed element is a hand edit', () => {
  const built = sampleScene();
  const moved = sampleScene();
  moved.elements.find(e => e.customData.kit === 'component').x += 40;
  assert.equal(sceneEdited(moved, built), true);
  const retexted = sampleScene();
  retexted.elements.find(e => e.type === 'text').text = 'renamed';
  assert.equal(sceneEdited(retexted, built), true);
  const added = sampleScene();
  added.elements.push({ ...added.elements[0], id: 'new-one' });
  assert.equal(sceneEdited(added, built), true);
  const removed = sampleScene();
  removed.elements[0].isDeleted = true;
  assert.equal(sceneEdited(removed, built), true);
});

test('with a snapshot the content decides, not the file times', () => {
  const dir = tmp();
  const file = path.join(dir, 'flow.excalidraw');
  const scene = sampleScene();
  fs.writeFileSync(file, JSON.stringify(scene));
  writeSnapshot(file, scene);
  touch(path.join(dir, 'flow.png'), 20);
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(file, later, later); // newer than the PNG, as after opening it in an editor
  assert.equal(editedByHand(dir, 'flow'), false);
  assert.equal(outputPaths(dir, 'flow').slug, 'flow');
  scene.elements.find(e => e.customData.kit === 'component').y += 80;
  fs.writeFileSync(file, JSON.stringify(scene));
  assert.equal(editedByHand(dir, 'flow'), true);
  assert.equal(outputPaths(dir, 'flow').slug, 'flow-v2');
});

test('overwrite keeps the slug even when the file was edited', () => {
  const dir = tmp();
  touch(path.join(dir, 'flow.excalidraw'), 5);
  assert.equal(outputPaths(dir, 'flow', { overwrite: true }).slug, 'flow');
});

test('a move of a few pixels is an accidental drag, not a hand edit', () => {
  const built = sampleScene();
  const nudged = sampleScene();
  const g = nudged.elements.find(e => e.customData.kit === 'component').groupIds[0];
  for (const e of nudged.elements.filter(x => x.groupIds.includes(g))) { e.x += 5; e.y += 5; }
  assert.equal(sceneEdited(nudged, built), false);
});
