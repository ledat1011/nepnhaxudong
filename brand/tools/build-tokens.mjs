import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const tokensDir = fileURLToPath(new URL('../tokens/', import.meta.url));

export function buildCss(tokens) {
  const lines = [':root {'];
  for (const [name, { value }] of Object.entries(tokens.color)) {
    lines.push(`  --color-${name}: ${value};`);
  }
  for (const [name, { family, fallback }] of Object.entries(tokens.font)) {
    lines.push(`  --font-${name}: '${family}', ${fallback};`);
  }
  lines.push('}', '');
  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const tokens = JSON.parse(readFileSync(tokensDir + 'tokens.json', 'utf8'));
  writeFileSync(tokensDir + 'tokens.css', buildCss(tokens));
  console.log('wrote brand/tokens/tokens.css');
}
