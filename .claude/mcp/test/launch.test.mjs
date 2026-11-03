import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSpawn } from '../launch.mjs';

test('resolveSpawn uses shell on Windows', () => {
  assert.deepEqual(resolveSpawn('npx', ['-y', 'shadcn@latest', 'mcp'], 'win32'),
    { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'], shell: true });
});

test('resolveSpawn runs directly on Linux', () => {
  assert.deepEqual(resolveSpawn('uvx', ['nanobanana-mcp-server@latest'], 'linux'),
    { command: 'uvx', args: ['nanobanana-mcp-server@latest'], shell: false });
});

test('resolveSpawn rejects unknown tools', () => {
  assert.throws(() => resolveSpawn('bash', [], 'linux'), /unsupported tool/);
});
