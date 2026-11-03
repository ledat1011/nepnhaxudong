export const STATE_PATH = 'docs/session/STATE.md';

const SESSION_DIR = 'docs/session/';

export function renderSessionStart({ stateText, isRemote }) {
  const lines = [];
  if (stateText === null) {
    lines.push('Repo chưa có docs/session/STATE.md. Hãy tạo nó theo CLAUDE.md trước khi làm việc.');
  } else if (stateText.trim() === '') {
    lines.push('docs/session/STATE.md đang trống. Hãy điền trạng thái theo CLAUDE.md.');
  } else {
    lines.push(`Trạng thái dự án (${STATE_PATH}):`, '', stateText);
  }
  if (isRemote) {
    lines.push('', 'Đây là cloud session: Docker có thể không có; xem docs/setup.md mục Cloud session.');
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
      'Có thay đổi trong repo nhưng docs/session/STATE.md chưa được cập nhật. Hãy cập nhật STATE.md và viết log session theo CLAUDE.md trước khi dừng.',
  };
}
