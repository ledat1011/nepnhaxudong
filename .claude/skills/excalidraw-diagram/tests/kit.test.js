'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const kit = require('../lib/kit');
const { textWidth } = require('../lib/measure');

const allComponents = d => ({
  serverStack: d.serverStack({ x: 0, y: 0, label: 'Server', note: 'does work' }),
  queue: d.queue({ x: 400, y: 0, label: 'topic' }),
  database: d.database({ x: 800, y: 0, label: 'DB', badge: 'doc' }),
  browserWindow: d.browserWindow({ x: 1200, y: 0, label: 'client' }),
  card: d.card({ x: 0, y: 400, label: 'other' }),
  diamond: d.diamond({ x: 400, y: 400, label: 'ok?' }),
  person: d.person({ x: 800, y: 400, label: 'user' }),
  channel: d.channel({ x: 1200, y: 400, label: 'EMAIL', glyph: 'at' }),
});

test('scene has the Excalidraw file shape', () => {
  const d = kit.createDiagram();
  d.card({ x: 0, y: 0, label: 'A' });
  const s = d.scene();
  assert.equal(s.type, 'excalidraw');
  assert.equal(s.version, 2);
  assert.equal(s.appState.viewBackgroundColor, '#ffffff');
  assert.deepEqual(s.files, {});
  assert.ok(s.elements.length > 0);
});

test('every component returns a bbox whose main element is in the scene and marked as component', () => {
  const d = kit.createDiagram();
  for (const [fn, b] of Object.entries(allComponents(d))) {
    assert.ok(d.elements().includes(b.main), `${fn}: main not in scene`);
    assert.equal(b.main.customData.kit, 'component', fn);
    for (const k of ['x', 'y', 'w', 'h', 'below', 'above']) assert.equal(typeof b[k], 'number', `${fn}.${k}`);
  }
});

test('the elements of one component share one group id', () => {
  const d = kit.createDiagram();
  const b = d.serverStack({ x: 0, y: 0, label: 'S', note: 'n' });
  const g = b.main.groupIds[0];
  const members = d.elements().filter(e => e.groupIds.includes(g));
  assert.equal(members.length, 12); // 3 × (box + dot + line) + name + note + binding frame
});

test('components are filled from the palette by meaning', () => {
  const d = kit.createDiagram();
  const c = allComponents(d);
  assert.equal(c.serverStack.main.backgroundColor, kit.PALETTE.service);
  assert.equal(c.queue.main.backgroundColor, kit.PALETTE.queue);
  assert.equal(c.database.main.backgroundColor, kit.PALETTE.data);
  assert.equal(c.browserWindow.main.backgroundColor, kit.PALETTE.external);
  assert.equal(c.card.main.backgroundColor, kit.PALETTE.other);
  assert.equal(c.channel.main.backgroundColor, kit.PALETTE.channel);
});

test('an unknown palette key, glyph, badge or side throws a helpful error', () => {
  const d = kit.createDiagram();
  assert.throws(() => d.card({ x: 0, y: 0, label: 'x', color: 'pinkish' }), /unknown palette key "pinkish"/);
  assert.throws(() => d.channel({ x: 0, y: 0, label: 'x', glyph: 'fax' }), /unknown glyph "fax"/);
  assert.throws(() => d.database({ x: 0, y: 0, label: 'x', badge: 'key' }), /unknown database badge "key"/);
  const a = d.card({ x: 0, y: 0, label: 'a' });
  assert.throws(() => d.link(a, 'x', a, 'l'), /unknown side "x"/);
});

test('a text element is as wide as its measured text and centred in its box', () => {
  const d = kit.createDiagram();
  const t = d.note({ x: 0, y: 0, w: 400, text: 'abcd', align: 'center' });
  assert.equal(t.width, textWidth('abcd', kit.SIZE.note, kit.FONT.plain));
  assert.equal(t.x, (400 - t.width) / 2);
  assert.equal(t.height, kit.SIZE.note * 1.25);
  assert.equal(t.customData.kit, 'note');
});

test('serverStack.below reaches the bottom of its note', () => {
  const d = kit.createDiagram();
  const b = d.serverStack({ x: 0, y: 0, label: 'S', note: 'line 1\nline 2' });
  const noteEl = d.elements().find(e => e.type === 'text' && e.text === 'line 1\nline 2');
  assert.equal(b.y + b.h + b.below, noteEl.y + noteEl.height);
});

test('a queue label can sit below the queue, and below then covers it', () => {
  const d = kit.createDiagram();
  const q = d.queue({ x: 0, y: 0, label: 'topic', labelBelow: true });
  const label = d.elements().find(e => e.type === 'text' && e.text === 'topic');
  assert.ok(label.y > q.y + q.h);
  assert.equal(q.y + q.h + q.below, label.y + label.height);
});

test('clean style draws straight lines and plain names', () => {
  const d = kit.createDiagram({ style: 'clean' });
  const b = d.card({ x: 0, y: 0, label: 'A' });
  assert.equal(b.main.roughness, 0);
  const label = d.elements().find(e => e.type === 'text');
  assert.equal(label.fontFamily, kit.FONT.plain);
});

test('save writes the scene as JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-test-'));
  const d = kit.createDiagram();
  d.card({ x: 0, y: 0, label: 'A' });
  const file = d.save(path.join(dir, 'a.excalidraw'));
  const back = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(back.type, 'excalidraw');
  assert.equal(back.elements.length, d.elements().length);
});

test('a hex colour is used as-is and does not enter the colour key', () => {
  const d = kit.createDiagram();
  const c = d.card({ x: 0, y: 0, label: 'event', color: '#c3fae8' });
  assert.equal(c.main.backgroundColor, '#c3fae8');
  d.legend({ x: 0, y: 400 });
  const rows = d.elements().filter(e => e.customData.kit === 'legend' && e.type === 'text').map(e => e.text);
  assert.ok(!rows.includes('other internal service'), rows.join(' | '));
  assert.deepEqual(rows, ['Colour key']);
});

test('legend extra rows are drawn after the palette rows', () => {
  const d = kit.createDiagram();
  d.queue({ x: 0, y: 0, label: 'topic' });
  d.legend({ x: 0, y: 400, extra: [{ color: '#c3fae8', label: 'event' }] });
  const legend = d.elements().filter(e => e.customData.kit === 'legend');
  const rows = legend.filter(e => e.type === 'text').map(e => e.text);
  assert.deepEqual(rows, ['Colour key', 'message queue / topic', 'event']);
  assert.ok(legend.some(e => e.type === 'rectangle' && e.backgroundColor === '#c3fae8'));
});

test('a malformed hex colour is an unknown palette key', () => {
  const d = kit.createDiagram();
  assert.throws(() => d.card({ x: 0, y: 0, label: 'x', color: '#xyz' }), /unknown palette key "#xyz"/);
  assert.throws(() => d.serverStack({ x: 0, y: 0, label: 'x', color: '#12345' }), /unknown palette key/);
  assert.throws(() => d.legend({ x: 0, y: 0, extra: [{ color: 'nope', label: 'x' }] }), /unknown palette key "nope"/);
});

test('every component that takes a colour accepts a hex colour', () => {
  const d = kit.createDiagram();
  assert.equal(d.serverStack({ x: 0, y: 0, label: 'S', color: '#c3fae8' }).main.backgroundColor, '#c3fae8');
  assert.equal(d.browserWindow({ x: 400, y: 0, label: 'B', color: '#c3fae8' }).main.backgroundColor, '#c3fae8');
  assert.equal(d.lifeline({ x: 800, y: 0, label: 'L', color: '#c3fae8' }).main.backgroundColor, '#c3fae8');
});
