import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCss } from '../build-tokens.mjs';
import { contentBBox, contrast, palette, rotateGroups, svgFacts } from '../lib/svg-check.mjs';
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

const withTempSvg = (source, check) => {
  const dir = mkdtempSync(join(tmpdir(), 'svgfacts-'));
  const file = join(dir, 'a.svg');
  writeFileSync(file, source);
  try {
    check(file);
  } finally {
    rmSync(dir, { recursive: true });
  }
};

test('svgFacts doc nhom cap 1, thuoc tinh va to tien', () => {
  withTempSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><path id="d"/></defs>' +
      '<g id="a" data-pivot="1 2"><g><path id="c"/></g></g><circle/></svg>',
    (file) => {
      const f = svgFacts(file);
      assert.deepEqual(f.topLevel, [
        { tag: 'defs', id: undefined },
        { tag: 'g', id: 'a' },
        { tag: 'circle', id: undefined },
      ]);
      assert.equal(f.elements.a.attributes['data-pivot'], '1 2');
      assert.deepEqual(f.elements.a.ancestors, []);
      assert.deepEqual(f.elements.c.ancestors, ['a']);
      assert.deepEqual(f.elements.d.ancestors, []);
    },
  );
});

const near = (actual, expected, label) => {
  for (const key of ['x', 'y', 'width', 'height']) {
    assert.ok(Math.abs(actual[key] - expected[key]) <= 1, `${label} ${key}: ${actual[key]} != ${expected[key]}`);
  }
};

test('contentBBox do ca hinh hoac rieng mot nhom, theo don vi viewBox', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 100 100">' +
    '<g id="a"><rect x="10" y="20" width="30" height="40" fill="#4A2C1A"/></g>' +
    '<g id="b"><g id="inner"><rect x="70" y="70" width="10" height="5" fill="#4A2C1A"/></g></g></svg>';
  near(contentBBox(svg), { x: 10, y: 20, width: 70, height: 55 }, 'ca hinh');
  near(contentBBox(svg, 'a'), { x: 10, y: 20, width: 30, height: 40 }, 'a');
  near(contentBBox(svg, 'inner'), { x: 70, y: 70, width: 10, height: 5 }, 'inner');
  assert.throws(() => contentBBox(svg, 'missing'), /missing/);
});

test('rotateGroups xoay nhom quanh data-pivot', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<g id="a" data-pivot="50 50"><rect x="40" y="0" width="20" height="10" fill="#4A2C1A"/></g></svg>';
  near(contentBBox(rotateGroups(svg, { a: 90 }), 'a'), { x: 90, y: 40, width: 10, height: 20 }, 'a 90 do');
});

const mascotPath = fileURLToPath(new URL('../../mascot/mascot-layered.svg', import.meta.url));
const ANIMATED = { head: 3, rice: 6 };

const pivotOf = (facts, id) => {
  const attributes = facts.elements[id].attributes;
  const pivot = attributes['data-pivot'];
  assert.match(pivot ?? '', /^\d+(\.\d+)? \d+(\.\d+)?$/, `${id} data-pivot`);
  const [x, y] = pivot.split(' ').map(Number);
  const style = (attributes.style ?? '').replace(/\s+/g, ' ');
  assert.match(style, /transform-box: view-box/, `${id} transform-box`);
  assert.match(style, new RegExp(`transform-origin: ${x}px ${y}px`), `${id} transform-origin khac data-pivot`);
  return { x, y };
};

const inside = (point, box) =>
  point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;

test('mascot tach lop dung cau truc', () => {
  const facts = svgFacts(mascotPath);
  assert.equal(facts.viewBox, '0 0 512 512');
  const groups = facts.topLevel.filter((x) => x.tag !== 'defs');
  assert.deepEqual(groups, ['body', 'rice', 'hands', 'head'].map((id) => ({ tag: 'g', id })), 'nhom cap 1 sai');
  if (facts.elements.eyes !== undefined) {
    assert.equal(facts.elements.eyes.tag, 'g');
    assert.ok(facts.elements.eyes.ancestors.includes('head'), 'g#eyes phai nam trong head');
  }
});

test('mascot dung mau, khong the cam, nhe', () => {
  const facts = svgFacts(mascotPath);
  const allowed = palette();
  assert.deepEqual([...facts.colors].filter((c) => !allowed.has(c)), [], 'mau ngoai bang');
  for (const tag of ['image', 'text', 'script', 'style', 'foreignObject']) {
    assert.ok(!facts.tags.has(tag), `co the <${tag}>`);
  }
  assert.deepEqual(facts.hrefs.filter((h) => !h.startsWith('#')), [], 'co href ra ngoai');
  assert.ok(facts.bytes < 40 * 1024, `${facts.bytes} byte`);
});

test('mascot: pivot head / rice khop transform-origin va nam trong nhom', () => {
  const facts = svgFacts(mascotPath);
  const svg = readFileSync(mascotPath, 'utf8');
  for (const id of Object.keys(ANIMATED)) {
    const pivot = pivotOf(facts, id);
    assert.ok(inside(pivot, contentBBox(svg, id)), `pivot ${id} nam ngoai khung nhom`);
  }
  assert.ok(inside(pivotOf(facts, 'rice'), contentBBox(svg, 'hands')), 'tay khong che diem nam bo lua');
});

test('mascot: xoay head / rice van nam trong viewBox', () => {
  const svg = readFileSync(mascotPath, 'utf8');
  for (const sign of [1, -1]) {
    const angles = Object.fromEntries(Object.entries(ANIMATED).map(([id, deg]) => [id, sign * deg]));
    const box = contentBBox(rotateGroups(svg, angles));
    assert.ok(box.x >= 0 && box.y >= 0, `goc ${sign > 0 ? '+' : '-'}: tran trai/tren ${JSON.stringify(box)}`);
    assert.ok(box.x + box.width <= 512, `goc ${sign > 0 ? '+' : '-'}: tran phai ${JSON.stringify(box)}`);
  }
});
