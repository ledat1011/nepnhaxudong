export const STATE_PATH = 'docs/session/STATE.md';

const SESSION_DIR = 'docs/session/';

export function renderSessionStart({ stateText, isRemote }) {
  const lines = [];
  if (stateText === null) {
    lines.push('The repo has no docs/session/STATE.md yet. Create it as described in CLAUDE.md before you start work.');
  } else if (stateText.trim() === '') {
    lines.push('docs/session/STATE.md is empty. Fill in the project state as described in CLAUDE.md.');
  } else {
    lines.push(`Project state (${STATE_PATH}):`, '', stateText);
  }
  if (isRemote) {
    lines.push('', 'This is a cloud session: Docker may not be available. See docs/setup.md, section "Cloud session".');
  }
  return lines.join('\n');
}

export function parsePorcelainZ(output) {
  const entries = output.split('\0');
  const paths = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry === '') continue;
    const status = entry.slice(0, 2);
    paths.push(entry.slice(3).replaceAll('\\', '/'));
    if (status[0] === 'R' || status[0] === 'C') i += 1;
  }
  return paths;
}

export function decideStop({ changedPaths, stopHookActive }) {
  if (stopHookActive || changedPaths === null || changedPaths.length === 0) {
    return { block: false };
  }
  if (changedPaths.includes(STATE_PATH)) return { block: false };
  if (changedPaths.every((p) => p.startsWith(SESSION_DIR))) return { block: false };
  return {
    block: true,
    reason:
      'The repo has changes but docs/session/STATE.md was not updated. Update STATE.md and write the session log as described in CLAUDE.md before you stop.',
  };
}
