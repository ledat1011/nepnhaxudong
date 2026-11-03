import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { scanText, scanDir } from '../scan-skill.mjs';

const fixture = (name) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test('scanText flags company words with line numbers', () => {
  const f = scanText('ok\nsee luz_eletter\nKlara admin', 'SKILL.md');
  assert.deepEqual(f.map(x => [x.line, x.pattern]), [[2, 'company-luz'], [3, 'company-klara']]);
});

test('scanText flags workspace path and company email', () => {
  const f = scanText('cd D:\\workspaces\\luz\\x\nmail a.b@axonactive.com', 'a.md');
  assert.deepEqual(f.map(x => x.pattern), ['company-luz', 'workspace-path', 'company-axon', 'company-email']);
});

test('scanText flags secrets that look real', () => {
  assert.equal(scanText('API_KEY=sk_live_abcdefghijklmnop', 'a.md')[0].pattern, 'secret-assignment');
});

test('scanText ignores placeholder secrets', () => {
  assert.deepEqual(scanText('GEMINI_API_KEY=${GEMINI_API_KEY}', 'a.md'), []);
});

test('scanDir counts CRLF lines correctly and skips binaries', () => {
  const f = scanDir(fixture('dirty-skill'));
  assert.ok(f.some(x => x.file.endsWith('notes-crlf.md') && x.line === 3));
  assert.ok(!f.some(x => x.file.endsWith('logo.png')));
});

test('scanDir returns nothing for a clean skill', () => {
  assert.deepEqual(scanDir(fixture('clean-skill')), []);
});
