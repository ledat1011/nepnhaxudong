import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decideStop, parsePorcelainZ } from './lib/session-state.mjs';

const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

let stopHookActive = false;
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  stopHookActive = input?.stop_hook_active === true;
} catch {
  stopHookActive = false;
}

let changedPaths = null;
try {
  const output = execFileSync('git', ['status', '--porcelain=v1', '-z'], {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  changedPaths = parsePorcelainZ(output);
} catch {
  changedPaths = null;
}

const result = decideStop({ changedPaths, stopHookActive });
if (result.block) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason: result.reason }));
}
