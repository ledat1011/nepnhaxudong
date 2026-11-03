import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SUPPORTED_TOOLS = new Set(['npx', 'uvx']);

export function resolveSpawn(tool, args, platform) {
  if (!SUPPORTED_TOOLS.has(tool)) {
    throw new Error(`unsupported tool: ${tool}`);
  }
  // On Windows, npx and uvx are .cmd shims, so they need a shell to start.
  return { command: tool, args: [...args], shell: platform === 'win32' };
}

function main() {
  const [tool, ...args] = process.argv.slice(2);
  let plan;
  try {
    plan = resolveSpawn(tool, args, process.platform);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  const child = spawn(plan.command, plan.args, { stdio: 'inherit', shell: plan.shell });
  child.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
