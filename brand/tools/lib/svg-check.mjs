import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const tokensPath = fileURLToPath(new URL('../../tokens/tokens.json', import.meta.url));

function channelToLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channelToLinear(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG 2.x contrast ratio between two #RRGGBB colors (1 to 21).
export function contrast(hexA, hexB) {
  const [light, dark] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// Lowercase hex codes of every color in brand/tokens/tokens.json.
export function palette() {
  const { color } = JSON.parse(readFileSync(tokensPath, 'utf8'));
  return new Set(Object.values(color).map((c) => c.value.toLowerCase()));
}
