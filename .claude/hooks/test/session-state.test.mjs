import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSessionStart, parsePorcelainZ, decideStop } from '../lib/session-state.mjs';

test('renderSessionStart wraps state text', () => {
  const out = renderSessionStart({ stateText: '## Giai đoạn hiện tại\nPhần C', isRemote: false });
  assert.match(out, /docs\/session\/STATE\.md/);
  assert.match(out, /Phần C/);
});
test('renderSessionStart handles missing state', () => {
  assert.match(renderSessionStart({ stateText: null, isRemote: false }), /chưa có docs\/session\/STATE\.md/);
});
test('renderSessionStart handles empty state', () => {
  assert.match(renderSessionStart({ stateText: '   \n', isRemote: false }), /STATE\.md đang trống/);
});
test('renderSessionStart notes cloud session', () => {
  assert.match(renderSessionStart({ stateText: 'x', isRemote: true }), /cloud session/);
});
test('parsePorcelainZ reads modified, untracked, unicode and spaced paths', () => {
  const out = ' M web/a.ts\0?? docs/ảnh ruộng.jpg\0';
  assert.deepEqual(parsePorcelainZ(out), ['web/a.ts', 'docs/ảnh ruộng.jpg']);
});
test('parsePorcelainZ keeps the new path of a rename', () => {
  assert.deepEqual(parsePorcelainZ('R  new.md\0old.md\0'), ['new.md']);
});
test('decideStop blocks when work changed but STATE.md did not', () => {
  const r = decideStop({ changedPaths: ['web/a.ts'], stopHookActive: false });
  assert.equal(r.block, true);
  assert.match(r.reason, /STATE\.md/);
});
test('decideStop allows when STATE.md changed', () => {
  assert.equal(decideStop({ changedPaths: ['web/a.ts', 'docs/session/STATE.md'], stopHookActive: false }).block, false);
});
test('decideStop allows when only session docs changed', () => {
  assert.equal(decideStop({ changedPaths: ['docs/session/log/2026-11-03-a.md'], stopHookActive: false }).block, false);
});
test('decideStop allows clean tree', () => {
  assert.equal(decideStop({ changedPaths: [], stopHookActive: false }).block, false);
});
test('decideStop never blocks twice in a row', () => {
  assert.equal(decideStop({ changedPaths: ['web/a.ts'], stopHookActive: true }).block, false);
});
test('decideStop allows when git status is unavailable', () => {
  assert.equal(decideStop({ changedPaths: null, stopHookActive: false }).block, false);
});
