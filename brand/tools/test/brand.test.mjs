import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCss } from '../build-tokens.mjs';
import { contrast, palette, svgFacts } from '../lib/svg-check.mjs';
import opentype from 'opentype.js';

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

const fontsDir = fileURLToPath(new URL('../../fonts/', import.meta.url));
const loadFont = (name) => {
  const buf = readFileSync(fontsDir + name);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const missingGlyphs = (font, text) =>
  [...new Set(text)].filter((ch) => ch !== ' ' && font.charToGlyph(ch).index === 0);

test('font co du dau tieng Viet', () => {
  assert.deepEqual(missingGlyphs(loadFont('Pacifico-Regular.ttf'), 'Nếp Nhà'), []);
  for (const weight of ['400', '500', '700']) {
    const file = `Quicksand-${weight}.ttf`;
    assert.deepEqual(
      missingGlyphs(loadFont(file), 'Xứ Đông · Gạo nếp cái hoa vàng'),
      [],
      file,
    );
  }
});

test('co file giay phep OFL', () => {
  for (const file of ['OFL-Pacifico.txt', 'OFL-Quicksand.txt']) {
    assert.match(readFileSync(fontsDir + file, 'utf8'), /SIL OPEN FONT LICENSE/i, file);
  }
});

const conceptsDir = fileURLToPath(new URL('../../concepts/', import.meta.url));

test('svgFacts doc mau, id, the va href', () => {
  const dir = mkdtempSync(join(tmpdir(), 'svgfacts-'));
  const file = join(dir, 'a.svg');
  writeFileSync(
    file,
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">' +
      '<g id="a"><path id="p" fill="#ABC" stroke="none" style="stroke: #4A2C1A; fill:white"/></g>' +
      '<use xlink:href="#p"/><image href="http://x/y.png"/>' +
      '<stop stop-color="currentColor"/><circle fill="transparent" stroke="black"/></svg>',
  );
  try {
    const f = svgFacts(file);
    assert.equal(f.viewBox, '0 0 10 10');
    assert.deepEqual(f.ids, [
      { tag: 'g', id: 'a' },
      { tag: 'path', id: 'p' },
    ]);
    assert.deepEqual([...f.colors].sort(), ['#4a2c1a', '#aabbcc', 'black', 'white']);
    assert.ok(f.tags.has('image') && f.tags.has('use') && f.tags.has('svg'));
    assert.deepEqual(f.hrefs, ['#p', 'http://x/y.png']);
    assert.equal(f.bytes, statSync(file).size);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('concept hop le', () => {
  const allowed = palette();
  for (let n = 1; n <= 6; n++) {
    const file = `concept-${n}.svg`;
    const facts = svgFacts(conceptsDir + file);
    assert.equal(facts.viewBox, '0 0 512 512', `${file} viewBox`);
    const groups = facts.ids.filter((x) => x.tag === 'g').map((x) => x.id);
    const order = ['body', 'rice', 'head'].map((id) => groups.indexOf(id));
    assert.ok(order.every((i) => i >= 0), `${file} thieu g#body / g#rice / g#head`);
    assert.ok(order[0] < order[1] && order[1] < order[2], `${file} sai thu tu body -> rice -> head`);
    assert.deepEqual([...facts.colors].filter((c) => !allowed.has(c)), [], `${file} mau ngoai bang`);
    for (const tag of ['image', 'text', 'script']) {
      assert.ok(!facts.tags.has(tag), `${file} co the <${tag}>`);
    }
    assert.deepEqual(facts.hrefs.filter((h) => !h.startsWith('#')), [], `${file} co href ra ngoai`);
    assert.ok(facts.bytes < 40 * 1024, `${file} = ${facts.bytes} byte`);
  }
});

test('concepts.png ton tai', () => {
  assert.ok(existsSync(conceptsDir + 'concepts.png'));
});
