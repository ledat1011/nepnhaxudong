#!/usr/bin/env node
// Scans skill folders for employer-specific content and secrets that look real.
// This keyword list is the only place in the repo where employer names may appear.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PATTERNS = [
  { name: 'company-luz', regex: /\bluz\b|luz_/i },
  { name: 'company-klara', regex: /klara/i },
  { name: 'company-axon', regex: /axon ?(active|ivy)/i },
  { name: 'company-oneapi', regex: /one ?api/i },
  { name: 'company-tenant', regex: /\btenants?\b/i },
  { name: 'workspace-path', regex: /[A-Z]:\\workspaces\\/i },
  { name: 'company-url', regex: /bitbucket\.org|atlassian\.net|\.axonactive\./i },
  { name: 'company-email', regex: /@axonactive\.com/i },
  {
    name: 'secret-assignment',
    regex: /(api[_-]?key|token|secret|password)\s*[:=]\s*['"]?(?!\$\{)[A-Za-z0-9_\-]{12,}/i,
  },
];

const SKIPPED_DIRS = new Set(['node_modules', '.git']);
const BINARY_SNIFF_BYTES = 8000;
const EXCERPT_MAX_LENGTH = 120;

export function scanText(text, file) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const { name, regex } of PATTERNS) {
      if (regex.test(lineText)) {
        findings.push({
          file,
          line: index + 1,
          pattern: name,
          excerpt: lineText.trim().slice(0, EXCERPT_MAX_LENGTH),
        });
      }
    }
  });
  return findings;
}

function isBinary(buffer) {
  return buffer.subarray(0, BINARY_SNIFF_BYTES).includes(0);
}

function collectFiles(dir, files) {
  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      collectFiles(path, files);
    } else {
      files.push(path);
    }
  }
}

export function scanDir(dir) {
  const files = [];
  collectFiles(dir, files);
  files.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const findings = [];
  for (const file of files) {
    const buffer = readFileSync(file);
    if (isBinary(buffer)) continue;
    findings.push(...scanText(buffer.toString('utf8'), file));
  }
  return findings;
}

function main(argv) {
  const dirs = argv.slice(2);
  if (dirs.length === 0) {
    console.error('Usage: node scripts/scan-skill.mjs <dir> [<dir>...]');
    return 2;
  }
  let total = 0;
  for (const dir of dirs) {
    let findings;
    try {
      findings = scanDir(dir);
    } catch (error) {
      console.error(`Cannot scan "${dir}": ${error.message}`);
      return 2;
    }
    for (const f of findings) {
      console.log(`${f.file}:${f.line} [${f.pattern}] ${f.excerpt}`);
    }
    total += findings.length;
  }
  return total > 0 ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main(process.argv);
}
