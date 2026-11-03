'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const kit = require('../lib/kit');

const twoCards = () => {
  const d = kit.createDiagram();
  const a = d.card({ x: 0, y: 0, label: 'A' });
  const b = d.card({ x: 500, y: 0, label: 'B' });
  return { d, a, b };
};
const isInside = ([x, y], t) => x > t.x && x < t.x + t.width && y > t.y && y < t.y + t.height;

test('link binds both ends and registers the arrow on both components', () => {
  const { d, a, b } = twoCards();
  const arrow = d.link(a, 'r', b, 'l');
  assert.equal(arrow.startBinding.elementId, a.bind.id);
  assert.equal(arrow.endBinding.elementId, b.bind.id);
  assert.ok(a.bind.boundElements.some(x => x.id === arrow.id));
  assert.ok(b.bind.boundElements.some(x => x.id === arrow.id));
  assert.equal(arrow.customData.kit, 'arrow');
});

test('arrows bind to an invisible frame around the icon, its name and its note', () => {
  const d = kit.createDiagram();
  const s = d.serverStack({ x: 0, y: 100, label: 'Consumer', note: 'line 1\nline 2' });
  const f = s.bind;
  assert.equal(f.customData.kit, 'bind');
  assert.equal(f.strokeColor, 'transparent');
  assert.equal(f.backgroundColor, 'transparent');
  assert.deepEqual([f.x, f.y, f.width, f.height], [s.x, s.y - s.above, s.w, s.above + s.h + s.below]);
  assert.deepEqual(f.groupIds, s.main.groupIds);
  // an editor that re-snaps a bound arrow puts it on the frame's edge, which is outside the name and the note
  const c = d.card({ x: 0, y: 600, label: 'C' });
  const down = d.link(s, 'b', c, 't');
  assert.equal(down.startBinding.elementId, f.id);
  assert.equal(down.y, f.y + f.height + kit.GAP);
});

test('link starts GAP outside the source edge, and under the note when it leaves the bottom', () => {
  const { d, a, b } = twoCards();
  const arrow = d.link(a, 'r', b, 'l');
  assert.equal(arrow.x, 240 + kit.GAP);
  assert.equal(arrow.y, 40);
  const s = d.serverStack({ x: 0, y: 300, label: 'S', note: 'a note' });
  const c = d.card({ x: 0, y: 700, label: 'C' });
  const down = d.link(s, 'b', c, 't');
  assert.equal(down.y, s.y + s.h + s.below + kit.GAP);
});

test('an arrow into the top of a component ends above its name', () => {
  const d = kit.createDiagram();
  const from = d.card({ x: 0, y: 0, label: 'C' });
  const stack = d.serverStack({ x: 0, y: 400, label: 'Server' });
  const q = d.queue({ x: 500, y: 400, label: 'topic' });
  for (const [target, text] of [[stack, 'Server'], [q, 'topic']]) {
    const arrow = d.link(from, 'b', target, 't');
    const nameEl = d.elements().find(e => e.type === 'text' && e.text === text);
    const last = arrow.points[arrow.points.length - 1];
    const endY = arrow.y + last[1];
    assert.ok(endY <= nameEl.y - kit.GAP + 1e-9, `${text}: arrow ends at ${endY}, name top is ${nameEl.y}`);
  }
});

test('arrow kinds set colour, width and dash', () => {
  const { d, a, b } = twoCards();
  assert.equal(d.link(a, 'r', b, 'l', { kind: 'data' }).strokeStyle, 'dashed');
  assert.equal(d.link(a, 'r', b, 'l', { kind: 'fail' }).strokeColor, '#c92a2a');
  const n = d.link(a, 'r', b, 'l', { kind: 'new' });
  assert.equal(n.strokeColor, '#f08c00');
  assert.equal(n.strokeWidth, 4);
  assert.throws(() => d.link(a, 'r', b, 'l', { kind: 'dotted' }), /unknown arrow kind "dotted"/);
});

test('a parallel link gets the label "in parallel", placed off the curve', () => {
  const { d, a, b } = twoCards();
  const arrow = d.link(a, 'r', b, 'l', { kind: 'parallel' });
  const label = d.elements().find(e => e.type === 'text' && e.text === 'in parallel');
  assert.equal(label.customData.kit, 'label');
  const mid = [arrow.x + arrow.points[1][0], arrow.y + arrow.points[1][1]];
  assert.ok(!isInside(mid, label), 'label covers the curve');
});

test('labelAt puts the label centre where asked', () => {
  const { d, a, b } = twoCards();
  d.link(a, 'r', b, 'l', { label: 'go', labelAt: [370, -40] });
  const label = d.elements().find(e => e.type === 'text' && e.text === 'go');
  assert.equal(label.x + label.width / 2, 370);
  assert.equal(label.y + label.height / 2, -40);
});

test('legend lists only the palette keys that were used, in palette order', () => {
  const d = kit.createDiagram();
  d.database({ x: 0, y: 0, label: 'DB' });
  d.serverStack({ x: 400, y: 0, label: 'S' });
  d.legend({ x: 0, y: 500 });
  const rows = d.elements().filter(e => e.type === 'text' && e.customData.kit === 'legend' && e.text !== 'Colour key');
  assert.deepEqual(rows.map(r => r.text), ['service / consumer', 'database / storage']);
});

test('an event card uses the event colour and the legend names it', () => {
  const d = kit.createDiagram();
  const e = d.card({ x: 0, y: 0, label: 'day 0\ncreated', color: 'event' });
  assert.equal(e.main.backgroundColor, '#c3fae8');
  d.legend({ x: 0, y: 500 });
  const rows = d.elements().filter(t => t.type === 'text' && t.customData.kit === 'legend' && t.text !== 'Colour key');
  assert.deepEqual(rows.map(r => r.text), ['event on a timeline']);
});

test('highlight is orange for new and red for problem', () => {
  const d = kit.createDiagram();
  assert.equal(d.highlight({ x: 0, y: 0, w: 100, h: 100, title: '★ new' }).main.strokeColor, '#f08c00');
  assert.equal(d.highlight({ x: 0, y: 0, w: 100, h: 100, kind: 'problem', title: '⚠ stuck' }).main.strokeColor, '#e03131');
});

test('lifelines and messages draw a sequence', () => {
  const d = kit.createDiagram();
  const a = d.lifeline({ x: 0, y: 0, label: 'A', length: 400 });
  const b = d.lifeline({ x: 400, y: 0, label: 'B', length: 400 });
  assert.equal(a.cx, 110);
  assert.equal(a.bottom, 470);
  const m = d.message(a, b, 150, { label: 'call' });
  assert.equal(m.customData.kit, 'message');
  assert.equal(m.x, 116);
  assert.equal(m.x + m.points[1][0], 504);
  const r = d.message(b, a, 220, { reply: true });
  assert.equal(r.strokeStyle, 'dashed');
  const self = d.message(a, a, 300, { label: 'retry' });
  assert.equal(self.points.length, 4);
});

test('line draws a free line with an arrow kind style', () => {
  const d = kit.createDiagram();
  const l = d.line({ points: [[0, 0], [500, 0]], kind: 'data' });
  assert.equal(l.type, 'line');
  assert.equal(l.strokeStyle, 'dashed');
  assert.equal(l.customData.kit, 'line');
});
