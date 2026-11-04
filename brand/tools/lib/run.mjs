import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// True when the module at moduleUrl is the script node was started with (not imported by a test).
// Safe when there is no script argument (node -e, REPL).
export const isDirectRun = (moduleUrl) =>
  process.argv[1] !== undefined && fileURLToPath(moduleUrl) === resolve(process.argv[1]);
