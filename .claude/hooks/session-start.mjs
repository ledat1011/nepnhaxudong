import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STATE_PATH, renderSessionStart } from './lib/session-state.mjs';

const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

let stateText = null;
try {
  stateText = readFileSync(resolve(projectDir, STATE_PATH), 'utf8');
} catch {
  stateText = null;
}

const isRemote = process.env.CLAUDE_CODE_REMOTE === 'true';
process.stdout.write(`${renderSessionStart({ stateText, isRemote })}\n`);
