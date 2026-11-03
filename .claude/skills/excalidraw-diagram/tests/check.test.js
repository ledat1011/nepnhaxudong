'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const kit = require('../lib/kit');
const { check, format, sampleCurve } = require('../lib/check');

// vertical on purpose: a wide, flat pair would (correctly) get the aspect-ratio warning
const cleanDiagram = () => {
  const d = kit.createDiagram();
  const a = d.card({ x: 0, y: 0, label: 'A' });
  const b = d.card({ x: 0, y: 300, label: 'B' });
  d.link(a, 'b', b, 't');
  return d;
};

test('a clean diagram has no errors and no warnings', () => {
  const r = check(cleanDiagram().scene());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.stats.components, 2);
});

test('overlapping texts are an error', () => {
  const d = cleanDiagram();
  d.note({ x: 0, y: 600, text: 'first note' });
  d.note({ x: 10, y: 605, text: 'second note' });
  assert.match(check(d.scene()).errors.join('\n'), /text overlap: "first note" ↔ "second note"/);
});

test('the invisible binding frame is not a shape for the overlap rules', () => {
  const d = kit.createDiagram();
  d.serverStack({ x: 0, y: 100, label: 'S', note: 'a long note under the stack' });
  // inside the frame's area (beside the name, above the icon) but clear of every visible shape and text
  d.note({ x: 150, y: 40, w: 60, text: 'x' });
  const r = check(d.scene());
  assert.deepEqual(r.errors, []);
  assert.equal(r.stats.components, 1);
});

test('a text that crosses another component is an error', () => {
  const d = kit.createDiagram();
  d.card({ x: 0, y: 0, label: 'Box' });
  d.note({ x: 200, y: 30, text: 'sticking out' });
  assert.match(check(d.scene()).errors.join('\n'), /text crosses shape: "sticking out" ↔ "Box"/);
});

test('a text fully inside a frame is fine, one across its border is not', () => {
  const d = kit.createDiagram();
  d.frame({ x: 0, y: 0, w: 1000, h: 600, label: 'service' });
  d.card({ x: 100, y: 100, label: 'inside' });
  assert.deepEqual(check(d.scene()).errors, []);
  d.note({ x: 950, y: 300, text: 'on the border' });
  assert.match(check(d.scene()).errors.join('\n'), /text crosses shape: "on the border" ↔ "service"/);
});

test('an arrow through a text is an error', () => {
  const d = kit.createDiagram();
  const a = d.card({ x: 0, y: 0, label: 'A' });
  const b = d.card({ x: 800, y: 0, label: 'B' });
  d.note({ x: 350, y: 25, text: 'in the way' });
  d.link(a, 'r', b, 'l', { bend: 0 });
  assert.match(check(d.scene()).errors.join('\n'), /arrow crosses text: arrow "A" → "B" through "in the way"/);
});

test('a narrow text sitting on a long straight arrow is an error', () => {
  const d = kit.createDiagram();
  const a = d.card({ x: 0, y: 0, label: 'A' });
  const b = d.card({ x: 800, y: 0, label: 'B' });
  d.note({ x: 517, y: 28, w: 10, text: '1' });
  d.link(a, 'r', b, 'l', { bend: 0 });
  assert.match(check(d.scene()).errors.join('\n'), /arrow crosses text: arrow "A" → "B" through "1"/);
});

test('text too small at a 1600 px display is an error', () => {
  const d = kit.createDiagram();
  d.card({ x: 0, y: 0, label: 'left', note: 'a note' });
  d.card({ x: 4000, y: 0, label: 'right' });
  const r = check(d.scene());
  assert.match(r.errors.join('\n'), /text too small: "a note" is \d+\.\d px at a 1600 px display/);
  assert.ok(r.stats.minScreenPx < 11);
});

test('an unbound arrow, too many highlights and long lines are warnings', () => {
  const d = cleanDiagram();
  d.highlight({ x: -40, y: -60, w: 320, h: 180, title: 'one' });
  d.highlight({ x: -40, y: 240, w: 320, h: 180, title: 'two' });
  d.note({ x: 0, y: 700, w: 900, text: 'this note line is much longer than forty characters' });
  const scene = d.scene();
  scene.elements.find(e => e.type === 'arrow').endBinding = null;
  const w = check(scene).warnings.join('\n');
  assert.match(w, /arrow not bound to a component/);
  assert.match(w, /2 highlight regions/);
  assert.match(w, /line longer than 40 characters/);
});

test('the long-line warning quotes the long line, not the first line of the note', () => {
  const d = cleanDiagram();
  d.note({ x: 0, y: 700, w: 900, text: 'short\nthis second line is clearly longer than forty characters' });
  const w = check(d.scene()).warnings.join('\n');
  assert.match(w, /line longer than 40 characters: "this second line is clearly/);
  assert.doesNotMatch(w, /: "short"/);
});

test('a label wider than its card is an error that names the text and the card', () => {
  const d = kit.createDiagram();
  d.card({ x: 0, y: 0, w: 120, label: 'a very long card label here' });
  const e = check(d.scene()).errors.join('\n');
  assert.match(e, /text overflows its box: "a very long card label here" in "a very long card label here" → shorten it, break the line or widen the box/);
});

test('a long label on a channel (left-aligned) is an overflow', () => {
  const d = kit.createDiagram();
  d.channel({ x: 0, y: 0, label: 'a very long channel label here', glyph: 'at' });
  assert.match(check(d.scene()).errors.join('\n'), /text overflows its box: "a very long channel label here"/);
});

test('a short label on a channel is not an overflow', () => {
  const d = kit.createDiagram();
  d.channel({ x: 0, y: 0, label: 'EMAIL', glyph: 'at' });
  assert.doesNotMatch(check(d.scene()).errors.join('\n'), /overflows/);
});

test('the overflow message quotes the overflowing line, not the first line', () => {
  const d = kit.createDiagram();
  d.card({ x: 0, y: 0, w: 150, label: 'two\nlines of label text here ok' });
  const e = check(d.scene()).errors.join('\n');
  assert.match(e, /text overflows its box: "lines of label text here ok"/);
  assert.doesNotMatch(e, /text overflows its box: "two"/);
});

test('a label that fits its card is not an overflow', () => {
  const d = kit.createDiagram();
  d.card({ x: 0, y: 0, label: 'A' });
  assert.doesNotMatch(check(d.scene()).errors.join('\n'), /overflows/);
});

test('a long name drawn below a server stack is not an overflow', () => {
  const d = kit.createDiagram();
  d.serverStack({ x: 0, y: 0, label: 'a server with a rather long name indeed' });
  assert.doesNotMatch(check(d.scene()).errors.join('\n'), /overflows/);
});

test('a wide, flat diagram gets the aspect warning', () => {
  const d = kit.createDiagram();
  d.card({ x: 0, y: 0, label: 'A' });
  d.card({ x: 1300, y: 0, label: 'B' });
  assert.match(check(d.scene()).warnings.join('\n'), /aspect ratio/);
});

test('sampleCurve starts and ends on the end points and passes through the middle point', () => {
  const pts = [[0, 0], [50, 40], [100, 0]];
  const s = sampleCurve(pts);
  assert.deepEqual(s[0], [0, 0]);
  assert.deepEqual(s[s.length - 1], [100, 0]);
  assert.ok(s.some(([x, y]) => Math.abs(x - 50) < 1e-9 && Math.abs(y - 40) < 1e-9));
});

test('format prints errors, warnings and the summary line', () => {
  const out = format({ errors: ['e1'], warnings: ['w1'], stats: { canvasWidth: 800, canvasHeight: 400, minScreenPx: 18, components: 2 } });
  assert.match(out, /^ERROR e1\nWARN  w1\ncanvas 800×400 px · smallest text 18\.0 px at 1600 px · 2 components · 1 errors, 1 warnings$/);
});

test('an arrow from a browser window is named by its label, not by its caption', () => {
  const d = kit.createDiagram();
  const a = d.browserWindow({ x: 0, y: 0, label: 'client-a' });
  const b = d.browserWindow({ x: 800, y: 0, label: 'client-b' });
  d.note({ x: 380, y: 55, text: 'in the way' });
  d.link(a, 'r', b, 'l', { bend: 0 });
  const e = check(d.scene()).errors.join('\n');
  assert.match(e, /arrow "client-a" → "client-b" through "in the way"/);
  assert.doesNotMatch(e, /"API"/);
});
