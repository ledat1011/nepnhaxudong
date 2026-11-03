import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildCss } from '../build-tokens.mjs';
import { contrast, palette } from '../lib/svg-check.mjs';

const tokensDir = fileURLToPath(new URL('../../tokens/', import.meta.url));
const readTokens = () => JSON.parse(readFileSync(tokensDir + 'tokens.json', 'utf8'));

test('tokens khop spec 2.1', () => {
  const { color } = readTokens();
  const expected = {
    'nau-dat': '#4A2C1A',
    'nau-ao': '#8B5A2B',
    'vang-lua': '#D9A13B',
    'vang-rom': '#F2E2B6',
    'trang-gao': '#FBF7EE',
    'hong-ma': '#E59A84',
    'xanh-ma': '#6E8B3D',
    da: '#F4CDA8',
  };
  assert.deepEqual(Object.keys(color).sort(), Object.keys(expected).sort());
  for (const [name, hex] of Object.entries(expected)) {
    assert.equal(color[name].value, hex, name);
    assert.ok(color[name].use, `${name} thieu mo ta use`);
  }
});

test('palette() tra ve 8 ma hex chu thuong', () => {
  const p = palette();
  assert.equal(p.size, 8);
  assert.ok(p.has('#4a2c1a'));
  assert.ok(p.has('#f4cda8'));
});

test('tokens.css sinh tu tokens.json', () => {
  const css = readFileSync(tokensDir + 'tokens.css', 'utf8').replace(/\r\n/g, '\n');
  assert.equal(buildCss(readTokens()), css);
});

test('tokens.css co bien mau va font', () => {
  const css = buildCss(readTokens());
  assert.match(css, /--color-nau-dat: #4A2C1A;/);
  assert.match(css, /--font-display: 'Pacifico', cursive;/);
  assert.match(css, /--font-body: 'Quicksand', sans-serif;/);
});

test('moi cap chu/nen dat AA', () => {
  const { color, textPairs } = readTokens();
  assert.ok(textPairs.length >= 7);
  for (const [fg, bg] of textPairs) {
    assert.ok(color[fg] && color[bg], `ten mau la: ${fg}/${bg}`);
    const ratio = contrast(color[fg].value, color[bg].value);
    assert.ok(ratio >= 4.5, `${fg}/${bg} = ${ratio.toFixed(2)} < 4.5`);
  }
});

test('contrast dung cong thuc', () => {
  assert.ok(Math.abs(contrast('#4A2C1A', '#FBF7EE') - 11.79) < 0.01);
  assert.ok(Math.abs(contrast('#D9A13B', '#FBF7EE') - 2.16) < 0.01);
});
