'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const kit = require('../lib/kit');
const { loadScene, EXPORT_PADDING } = require('../lib/gif/scene');

// order-service → payment-service (straight) and order-service → orders-db (curved), written as an .excalidraw
function sceneFile() {
  const d = kit.createDiagram();
  const orders = d.serverStack({ x: 0, y: 0, w: 240, label: 'order-service', note: 'validates the order' });
  const pay = d.serverStack({ x: 500, y: 0, w: 240, label: 'payment-service' });
  const db = d.database({ x: 520, y: 400, h: 150, label: 'orders-db' });
  d.link(orders, 'r', pay, 'l', { bend: 0 });
  d.link(orders, 'b', db, 'l', { kind: 'data' });
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gif-scene-test-')), 'tiny.excalidraw');
  fs.writeFileSync(file, JSON.stringify(d.scene()));
  return file;
}

test('the GIF uses the same export padding as the PNG', () => {
  assert.equal(EXPORT_PADDING, require('../lib/render').EXPORT_PADDING);
});

test('the GIF reads component roles with the lint\'s roleOf', () => {
  const { roleOf } = require('../lib/check');
  assert.equal(roleOf({ customData: { kit: 'bind' } }), 'bind');
  assert.equal(roleOf({}), '');
});

test('a component is found by its exact name first, then by part of a name', () => {
  const scene = loadScene(sceneFile());
  assert.ok(scene.component('order-service').names.includes('order-service'));
  assert.ok(scene.component('payment').names.includes('payment-service'));
});

test('a name that matches 2 components is an error', () => {
  const scene = loadScene(sceneFile());
  assert.throws(() => scene.component('service'), /"service" matches 2 components/);
});

test('an unknown name is an error that lists every component', () => {
  const scene = loadScene(sceneFile());
  assert.throws(() => scene.component('billing'), e =>
    /no component named "billing"/.test(e.message) && /order-service/.test(e.message) && /orders-db/.test(e.message));
});

test('arrow(a, b) starts at a and ends at b', () => {
  const scene = loadScene(sceneFile());
  const pts = scene.arrow('order-service', 'payment-service');
  const a = scene.component('order-service').box;
  const b = scene.component('payment-service').box;
  const [sx] = pts[0];
  const [ex] = pts[pts.length - 1];
  assert.ok(Math.abs(sx - (a.x + a.w)) < 30, `start x ${sx} is next to the right side ${a.x + a.w}`);
  assert.ok(Math.abs(ex - b.x) < 30, `end x ${ex} is next to the left side ${b.x}`);
});

test('an arrow asked for in the wrong direction suggests reverse()', () => {
  const scene = loadScene(sceneFile());
  assert.throws(() => scene.arrow('payment-service', 'order-service'), /use reverse\(arrow\("order-service", "payment-service"\)\)/);
});

test('a curved arrow is sampled along the curve', () => {
  const file = sceneFile();
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')).elements.find(e => e.type === 'arrow' && e.roundness);
  const pts = loadScene(file).arrow('order-service', 'orders-db');
  assert.ok(pts.length > raw.points.length * 10, `${pts.length} samples for ${raw.points.length} points`);
});

test('the invisible bind frame does not make a component box bigger', () => {
  const file = sceneFile();
  const scene = loadScene(file);
  const c = scene.component('order-service');
  const bind = JSON.parse(fs.readFileSync(file, 'utf8')).elements
    .find(e => e.customData && e.customData.kit === 'bind' && e.groupIds[0] === c.group);
  assert.ok(c.box.h < bind.height, `box ${c.box.h} is smaller than the bind frame ${bind.height} (icon + name + note)`);
});
