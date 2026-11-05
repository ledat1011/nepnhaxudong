import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCss } from '../build-tokens.mjs';
import { contentBBox, contrast, palette, rotateGroups, svgFacts, visibleBBox } from '../lib/svg-check.mjs';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';
import { parseSync } from 'svgson';

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
    toc: '#222222',
    'xanh-troi': '#CFE4EE',
    'xanh-troi-nhat': '#E9F2F1',
    'xanh-la-nhat': '#A9C47F',
  };
  assert.deepEqual(Object.keys(color).sort(), Object.keys(expected).sort());
  for (const [name, hex] of Object.entries(expected)) {
    assert.equal(color[name].value, hex, name);
    assert.ok(color[name].use, `${name} thieu mo ta use`);
  }
});

test('use cua cac mau chi dung trong hinh minh hoa ghi ro dieu do', () => {
  const { color } = readTokens();
  for (const name of ['hong-ma', 'da', 'toc', 'xanh-troi', 'xanh-troi-nhat', 'xanh-la-nhat']) {
    assert.ok(color[name].use.includes('chỉ trong hình minh hoạ'), `${name}: use thieu "chỉ trong hình minh hoạ"`);
  }
});

test('palette() tra ve 12 ma hex chu thuong', () => {
  const p = palette();
  assert.equal(p.size, 12);
  assert.ok(p.has('#a9c47f'));
  assert.ok(p.has('#cfe4ee'));
  assert.ok(p.has('#4a2c1a'));
  assert.ok(p.has('#f4cda8'));
  assert.ok(p.has('#222222'));
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
  assert.deepEqual(textPairs, [
    ['nau-dat', 'trang-gao'],
    ['nau-dat', 'vang-rom'],
    ['nau-ao', 'trang-gao'],
    ['nau-ao', 'vang-rom'],
    ['trang-gao', 'nau-ao'],
    ['trang-gao', 'nau-dat'],
    ['vang-lua', 'nau-dat'],
  ]);
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

test('concepts.png ton tai va moi (chay npm run concepts sau khi sua concept)', async () => {
  assert.ok(existsSync(conceptsDir + 'concepts.png'));
  const { conceptsPngPath, renderConceptsPng } = await import('../render-concepts.mjs');
  assert.ok(readFileSync(conceptsPngPath).equals(renderConceptsPng()), 'concepts.png cu, chay npm run concepts');
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
const logoMascotPath = fileURLToPath(new URL('../../logo/mascot-logo.svg', import.meta.url));
const logoMascotHeadPath = fileURLToPath(new URL('../../logo/mascot-logo-head.svg', import.meta.url));
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

// The mascot is traced from the approved illustration by vectorize-mascot.py: 89,962 bytes, with
// the drawn straw bundle and rope. The ~8 KB left under the limit is on purpose: it blocks adding
// more detail (logo-full, mascot + 24 KB, has about 2.7 KB left), and it still catches an untuned
// trace (near the vtracer defaults the same picture gives about 150 KB).
const MASCOT_MAX_BYTES = 96 * 1024;

test('mascot dung mau, khong the cam, nhe', () => {
  const facts = svgFacts(mascotPath);
  const allowed = palette();
  assert.deepEqual([...facts.colors].filter((c) => !allowed.has(c)), [], 'mau ngoai bang');
  for (const tag of ['image', 'text', 'script', 'style', 'foreignObject']) {
    assert.ok(!facts.tags.has(tag), `co the <${tag}>`);
  }
  assert.deepEqual(facts.hrefs.filter((h) => !h.startsWith('#')), [], 'co href ra ngoai');
  assert.ok(facts.bytes < MASCOT_MAX_BYTES, `${facts.bytes} byte`);
});

// The traced mascot is plain filled paths (what build-logos handles), and the page background
// color (Trang gao) is left transparent, not painted.
const TRACED_ATTRIBUTES = new Set(['d', 'fill', 'transform']);

test('mascot: chi gom path to mau, nen trong suot', () => {
  const background = readTokens().color['trang-gao'].value.toLowerCase();
  for (const file of [mascotPath]) {
    const root = parseSync(readFileSync(file, 'utf8'));
    const groups = root.children.filter((child) => child.type === 'element');
    const visit = (node, where) => {
      for (const child of node.children.filter((c) => c.type === 'element')) {
        if (child.name === 'g') {
          visit(child, `${where} > g`);
          continue;
        }
        assert.equal(child.name, 'path', `${where} co the <${child.name}>`);
        const extra = Object.keys(child.attributes).filter((key) => !TRACED_ATTRIBUTES.has(key));
        assert.deepEqual(extra, [], `${where} path co thuoc tinh ${extra.join(', ')}`);
        assert.notEqual(child.attributes.fill?.toLowerCase(), background, `${where} to mau nen`);
      }
    };
    for (const group of groups) visit(group, `${file.split(/[\\/]/).pop()} g#${group.attributes.id}`);
    assert.ok(!('stroke' in root.attributes), 'svg goc co stroke');
  }
});

const vectorizePath = fileURLToPath(new URL('../vectorize-mascot.py', import.meta.url));

test('vectorize-mascot.py: ghi nguon anh, khong co duong dan may', () => {
  const script = readFileSync(vectorizePath, 'utf8');
  const header = script.slice(0, script.indexOf('"""', 3));
  assert.match(header, /approved on 2026-11-03/, 'thieu ghi chu nguon anh');
  for (const local of [/\b[A-Za-z]:\\/, /AppData/i, /scratchpad/i, /\/(Users|home)\//]) {
    assert.doesNotMatch(script, local, `co duong dan may ${local}`);
  }
});

const pathsByGroup = (file) => {
  const root = parseSync(readFileSync(file, 'utf8'));
  const found = {};
  const visit = (node, group) => {
    for (const child of node.children.filter((c) => c.type === 'element')) {
      const inGroup = group ?? (child.name === 'g' ? child.attributes.id : undefined);
      if (child.name === 'path') (found[inGroup] ??= []).push(child.attributes);
      visit(child, inGroup);
    }
  };
  visit(root, undefined);
  return found;
};

test('mascot: toc den chi trong head, vien van Nau dat', () => {
  const { color } = readTokens();
  const [hair, ink] = [color.toc.value, color['nau-dat'].value].map((c) => c.toLowerCase());
  const groups = pathsByGroup(mascotPath);
  const fills = (id) => new Set(groups[id].map((a) => a.fill.toLowerCase()));
  assert.ok(fills('head').has(hair), 'head khong co toc den');
  assert.ok(fills('head').has(ink), 'head mat vien Nau dat');
  for (const id of ['body', 'rice', 'hands']) {
    assert.ok(!fills(id).has(hair), `g#${id} co mau toc`);
  }
});

const HEAD_SIZE = 512;
// A few pixels of antialiasing can touch between two shapes; a real loose piece is far larger.
const SPECK_PIXELS = 24;

// Opaque regions (4-connected) and transparent pixels the drawing fully encloses, on a render.
function alphaFacts(svg, size) {
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render();
  const { width, height } = image;
  const pixels = image.pixels;
  const opaque = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) opaque[p] = pixels[p * 4 + 3] >= 128;
  const seen = new Uint8Array(width * height);
  const fill = (start, value) => {
    const stack = [start];
    let count = 0;
    while (stack.length) {
      const p = stack.pop();
      if (seen[p] || opaque[p] !== value) continue;
      seen[p] = 1;
      count++;
      const [x, y] = [p % width, Math.floor(p / width)];
      if (x > 0) stack.push(p - 1);
      if (x < width - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - width);
      if (y < height - 1) stack.push(p + width);
    }
    return count;
  };
  for (let x = 0; x < width; x++) {
    fill(x, 0);
    fill((height - 1) * width + x, 0);
  }
  for (let y = 0; y < height; y++) {
    fill(y * width, 0);
    fill(y * width + width - 1, 0);
  }
  let enclosed = 0;
  const pieces = [];
  for (let p = 0; p < width * height; p++) {
    if (seen[p]) continue;
    if (opaque[p]) pieces.push(fill(p, 1));
    else enclosed += fill(p, 0);
  }
  return { enclosed, pieces };
}

test('alphaFacts dem lo kin va manh roi', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<path d="M10 10h40v40h-40zM20 20v20h20v-20z" fill="#4A2C1A" fill-rule="evenodd"/>' +
    '<rect x="70" y="70" width="10" height="10" fill="#4A2C1A"/></svg>';
  const facts = alphaFacts(svg, 100);
  assert.ok(Math.abs(facts.enclosed - 400) <= 40, `lo ${facts.enclosed}`);
  assert.equal(facts.pieces.filter((n) => n > SPECK_PIXELS).length, 2);
});

// ---------- logo mascot: the simplified mascot for logo-mono and logo-icon ----------

// Hand-drawn body / rice / hands with stroked outlines and a traced head: about 21 KB. The limit
// keeps it a small, simplified drawing (the detailed mascot-layered.svg is about 88 KB).
const LOGO_MASCOT_MAX_BYTES = 30 * 1024;
// What the logo mascot's elements may carry: geometry, fill, stroke (its outlines are strokes) and
// the animation attributes of #head / #rice. Anything else could paint in a way the logos do not handle.
const LOGO_MASCOT_ATTRIBUTES = new Set([
  'd', 'fill', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap', 'cx', 'cy', 'r', 'id', 'data-pivot', 'style',
]);

test('logo mascot: viewBox, nhom dung thu tu, dung mau, khong the cam, nhe', () => {
  const facts = svgFacts(logoMascotPath);
  assert.equal(facts.viewBox, '0 0 512 512');
  assert.deepEqual(facts.topLevel, ['body', 'rice', 'hands', 'head'].map((id) => ({ tag: 'g', id })), 'nhom cap 1 sai');
  const allowed = palette();
  assert.deepEqual([...facts.colors].filter((c) => !allowed.has(c)), [], 'mau ngoai bang');
  for (const tag of ['image', 'text', 'script', 'style', 'foreignObject', 'linearGradient', 'radialGradient']) {
    assert.ok(!facts.tags.has(tag), `co the <${tag}>`);
  }
  assert.deepEqual(facts.hrefs, [], 'co href');
  assert.ok(facts.bytes <= LOGO_MASCOT_MAX_BYTES, `${facts.bytes} byte`);
});

test('logo mascot: chi path / circle, thuoc tinh trong danh sach (cho phep stroke), toc chi trong head', () => {
  const { color } = readTokens();
  const [hair, background] = [color.toc.value, color['trang-gao'].value].map((c) => c.toLowerCase());
  const root = parseSync(readFileSync(logoMascotPath, 'utf8'));
  const visit = (node, group) => {
    for (const child of node.children.filter((c) => c.type === 'element')) {
      const inGroup = group ?? child.attributes.id;
      const where = `g#${inGroup}`;
      assert.ok(['g', 'path', 'circle'].includes(child.name), `${where} co the <${child.name}>`);
      const extra = Object.keys(child.attributes).filter((key) => !LOGO_MASCOT_ATTRIBUTES.has(key));
      assert.deepEqual(extra, [], `${where} co thuoc tinh ${extra.join(', ')}`);
      const paints = [child.attributes.fill, child.attributes.stroke].map((c) => c?.toLowerCase());
      assert.ok(!paints.includes(background), `${where} to mau nen`);
      if (inGroup !== 'head') assert.ok(!paints.includes(hair), `${where} co mau toc`);
      visit(child, inGroup);
    }
  };
  visit(root, undefined);
  assert.equal(root.attributes.stroke, color['nau-dat'].value, 'vien phai la Nau dat');
});

test('logo mascot: pivot head / rice giong mascot-layered, khop transform-origin, nam trong nhom', () => {
  const facts = svgFacts(logoMascotPath);
  const detailed = svgFacts(mascotPath);
  const svg = readFileSync(logoMascotPath, 'utf8');
  for (const id of Object.keys(ANIMATED)) {
    const pivot = pivotOf(facts, id);
    assert.deepEqual(pivot, pivotOf(detailed, id), `pivot ${id} khac mascot-layered`);
    assert.ok(inside(pivot, contentBBox(svg, id)), `pivot ${id} nam ngoai khung nhom`);
  }
});

test('mascot-logo-head: dau day du cho logo-icon, khong lo, mot khoi', () => {
  const facts = svgFacts(logoMascotHeadPath);
  assert.equal(facts.viewBox, `0 0 ${HEAD_SIZE} ${HEAD_SIZE}`);
  assert.deepEqual(facts.topLevel, [{ tag: 'g', id: 'head' }]);
  const allowed = palette();
  assert.deepEqual([...facts.colors].filter((c) => !allowed.has(c)), [], 'mau ngoai bang');
  const { enclosed, pieces } = alphaFacts(readFileSync(logoMascotHeadPath, 'utf8'), HEAD_SIZE);
  assert.equal(enclosed, 0, `${enclosed} px lo trong dau`);
  const big = pieces.filter((n) => n > SPECK_PIXELS);
  assert.equal(big.length, 1, `dau gom ${big.length} manh: ${big.join(', ')} px`);
});

test('logo mascot sinh tu build-logo-mascot.mjs (chay npm run logo-mascot sau khi sua hinh ve)', async () => {
  const { buildLogoMascot, committedHead } = await import('../build-logo-mascot.mjs');
  const built = buildLogoMascot(committedHead());
  for (const [name, file] of [['mascot-logo.svg', logoMascotPath], ['mascot-logo-head.svg', logoMascotHeadPath]]) {
    const onDisk = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    assert.ok(onDisk === built[name], `${name} cu, chay npm run logo-mascot`);
  }
});

test('committedHead doc duoc file CRLF (checkout tren Windows)', async () => {
  const { committedHead } = await import('../build-logo-mascot.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'crlf-'));
  try {
    for (const file of [logoMascotPath, logoMascotHeadPath]) {
      const lf = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      writeFileSync(join(dir, file.split(/[\\/]/).pop()), lf.replace(/\n/g, '\r\n'));
    }
    const head = committedHead(dir);
    assert.ok(head.head.length > 0 && head.icon.length > 0, 'khong doc duoc path cua dau');
    assert.deepEqual(head, committedHead());
  } finally {
    rmSync(dir, { recursive: true });
  }
});

const traceHeadPath = fileURLToPath(new URL('../trace-logo-head.py', import.meta.url));
const logoMascotBuilderPath = fileURLToPath(new URL('../build-logo-mascot.mjs', import.meta.url));

test('trace-logo-head.py: doc nguon qua read_source (kiem SHA-256), khong co duong dan may', () => {
  const script = readFileSync(traceHeadPath, 'utf8');
  const header = script.slice(0, script.indexOf('"""', 3));
  assert.match(header, /approved on 2026-11-03/, 'thieu ghi chu nguon anh');
  assert.match(script, /vm\.read_source\(/, 'phai doc nguon qua read_source cua vectorize-mascot.py');
  const vectorize = readFileSync(vectorizePath, 'utf8');
  const readSource = vectorize.slice(vectorize.indexOf('def read_source'), vectorize.indexOf('def main'));
  assert.match(readSource, /!= SOURCE_SHA256/, 'read_source phai kiem SHA-256');
  for (const file of [traceHeadPath, logoMascotBuilderPath]) {
    for (const local of [/\b[A-Za-z]:\\/, /AppData/i, /scratchpad/i, /\/(Users|home)\//]) {
      assert.doesNotMatch(readFileSync(file, 'utf8'), local, `${file} co duong dan may ${local}`);
    }
  }
});

const vectorizePosePath = fileURLToPath(new URL('../vectorize-pose.py', import.meta.url));

test('vectorize-pose.py: ghi nguon anh, dung lai vectorize-mascot.py, khong co duong dan may', () => {
  const script = readFileSync(vectorizePosePath, 'utf8');
  const header = script.slice(0, script.indexOf('"""', 3));
  assert.match(header, /approved by the owner on 2026-11-05/, 'thieu ghi chu nguon anh');
  assert.match(script, /spec_from_file_location\('vectorize_mascot'/, 'phai nhap vectorize-mascot.py bang importlib');
  assert.match(script, /vm\.classify\(/, 'phai phan loai mau bang classify cua vectorize-mascot.py');
  assert.match(script, /vm\.trace\(/, 'phai trace bang trace cua vectorize-mascot.py');
  for (const local of [/\b[A-Za-z]:\\/, /AppData/i, /scratchpad/i, /\/(Users|home)\//]) {
    assert.doesNotMatch(script, local, `co duong dan may ${local}`);
  }
});

// The first Python with the packages of requirements-mascot.txt, or null.
const python = ['python3', 'python'].find(
  (cmd) => spawnSync(cmd, ['-c', 'import vtracer, numpy, PIL'], { stdio: 'ignore' }).status === 0,
) ?? null;

// A 1024 x 1024 picture like a Recraft pose: near-white background, a Nâu áo blob with a Nâu đất
// outline from y 300 to y 1000, and a near-white hole in its middle that touches no border.
const SYNTHETIC_POSE = `
import sys
from PIL import Image, ImageDraw
im = Image.new('RGB', (1024, 1024), (252, 252, 251))
d = ImageDraw.Draw(im)
d.ellipse([312, 300, 712, 1000], fill=(137, 90, 50), outline=(80, 47, 31), width=12)
d.ellipse([452, 590, 572, 710], fill=(252, 252, 251), outline=(80, 47, 31), width=12)
im.save(sys.argv[1])
`;

// The same picture with only the background: nothing is drawn.
const BLANK_POSE = `
import sys
from PIL import Image
Image.new('RGB', (1024, 1024), (252, 252, 251)).save(sys.argv[1])
`;

test(
  'vectorize-pose.py: anh khong co hinh ve thi dung voi thong bao ro rang',
  { skip: python === null && 'can Python 3 co vtracer, numpy, Pillow (pip install -r requirements-mascot.txt)' },
  () => {
    const dir = mkdtempSync(join(tmpdir(), 'nepnha-pose-'));
    try {
      const png = join(dir, 'blank.png');
      const make = spawnSync(python, ['-c', BLANK_POSE, png], { encoding: 'utf8' });
      assert.equal(make.status, 0, make.stderr);
      const run = spawnSync(python, [vectorizePosePath, png, join(dir, 'blank.svg')], { encoding: 'utf8' });
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /no drawn pixels/);
      assert.doesNotMatch(run.stderr, /Traceback|ValueError/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

test(
  'vectorize-pose.py: mot nhom person, chan cham day 256, lo kin giu Trang gao',
  { skip: python === null && 'can Python 3 co vtracer, numpy, Pillow (pip install -r requirements-mascot.txt)' },
  () => {
    const dir = mkdtempSync(join(tmpdir(), 'nepnha-pose-'));
    try {
      const png = join(dir, 'pose.png');
      const out = join(dir, 'pose.svg');
      const make = spawnSync(python, ['-c', SYNTHETIC_POSE, png], { encoding: 'utf8' });
      assert.equal(make.status, 0, make.stderr);
      const run = spawnSync(python, [vectorizePosePath, png, out], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);

      const svg = readFileSync(out, 'utf8');
      const root = parseSync(svg);
      assert.equal(root.attributes.viewBox, '0 0 256 256');
      const children = root.children.filter((c) => c.type === 'element');
      assert.equal(children.length, 1, 'svg goc phai co dung mot nhom');
      assert.equal(children[0].name, 'g');
      assert.equal(children[0].attributes['data-part'], 'person');

      const image = new Resvg(svg, { fitTo: { mode: 'width', value: 256 } }).render();
      const alpha = (x, y) => image.pixels[(y * 256 + x) * 4 + 3];
      const rows = [...Array(256).keys()].filter((y) => [...Array(256).keys()].some((x) => alpha(x, y) > 0));
      assert.equal(Math.max(...rows) + 1, 256, 'diem ve thap nhat phai o y = 256');
      const at = (128 * 256 + 128) * 4;
      const hole = [...image.pixels.slice(at, at + 4)];
      assert.deepEqual(hole, [0xfb, 0xf7, 0xee, 255], 'lo kin phai giu mau Trang gao');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

test('mascot: pivot head / rice khop transform-origin va nam trong nhom', () => {
  const facts = svgFacts(mascotPath);
  const svg = readFileSync(mascotPath, 'utf8');
  for (const id of Object.keys(ANIMATED)) {
    const pivot = pivotOf(facts, id);
    assert.ok(inside(pivot, contentBBox(svg, id)), `pivot ${id} nam ngoai khung nhom`);
  }
  assert.ok(inside(pivotOf(facts, 'rice'), contentBBox(svg, 'hands')), 'tay khong che diem nam bo lua');
});

// Enclosed transparent pixels at 1024 px when the head / rice tilt (the animation's range). The
// trace today gives at most 205 (rice -6 deg: real background between grains); a hole the parts
// do not paint under (the head's colors behind the rice, rice under the hands) gives thousands.
const ROTATION_HOLE_BUDGET = 400;
const ROTATION_SIZE = 1024;

test('mascot: xoay head / rice khong lo nen', () => {
  const svg = readFileSync(mascotPath, 'utf8');
  const frames = [{}];
  for (const sign of [1, -1]) {
    frames.push({ head: sign * ANIMATED.head }, { rice: sign * ANIMATED.rice });
    frames.push({ head: sign * ANIMATED.head, rice: sign * ANIMATED.rice });
  }
  for (const angles of frames) {
    const { enclosed } = alphaFacts(rotateGroups(svg, angles), ROTATION_SIZE);
    assert.ok(enclosed <= ROTATION_HOLE_BUDGET, `${JSON.stringify(angles)}: ${enclosed} px lo`);
  }
});

test('mascot va logo mascot: xoay head / rice van nam trong viewBox', () => {
  for (const file of [mascotPath, logoMascotPath]) {
    const svg = readFileSync(file, 'utf8');
    const name = file.split(/[\\/]/).pop();
    for (const sign of [1, -1]) {
      const angles = Object.fromEntries(Object.entries(ANIMATED).map(([id, deg]) => [id, sign * deg]));
      const box = contentBBox(rotateGroups(svg, angles));
      const where = `${name} goc ${sign > 0 ? '+' : '-'}`;
      assert.ok(box.x >= 0 && box.y >= 0, `${where}: tran trai/tren ${JSON.stringify(box)}`);
      assert.ok(box.x + box.width <= 512, `${where}: tran phai ${JSON.stringify(box)}`);
    }
  }
});

test('visibleBBox tinh ca clipPath, svg long nhau va phan tran ra ngoai viewBox', () => {
  const clipped =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><clipPath id="c"><rect width="50" height="50"/></clipPath>' +
    '<g clip-path="url(#c)"><rect x="-5" y="-5" width="80" height="80" fill="#4A2C1A"/></g></svg>';
  near(visibleBBox(clipped), { x: 0, y: 0, width: 50, height: 50 }, 'clipPath');
  const nested =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><svg x="10" y="10" width="50" height="50" viewBox="0 0 10 10">' +
    '<rect x="-5" y="-5" width="30" height="30" fill="#4A2C1A"/></svg></svg>';
  near(visibleBBox(nested), { x: 10, y: 10, width: 50, height: 50 }, 'svg long nhau');
  const over =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" viewBox="0 0 100 100">' +
    '<rect x="-5" y="60" width="130" height="50" fill="#4A2C1A"/></svg>';
  near(visibleBBox(over), { x: -5, y: 60, width: 130, height: 50 }, 'tran viewBox');
  const sharp =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">' +
    '<path d="M20 50L120 45L20 40" fill="none" stroke="#4A2C1A" stroke-width="10" stroke-linejoin="round"/></svg>';
  near(visibleBBox(sharp), { x: 20, y: 35, width: 105, height: 20 }, 'goc nhon, noi tron');
  assert.throws(() => visibleBBox('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>'), /nothing/);
});

const logoDir = fileURLToPath(new URL('../../logo/', import.meta.url));
const LOGOS = ['logo-full-light.svg', 'logo-full.svg', 'logo-icon.svg', 'logo-mono-light.svg', 'logo-mono.svg'];
const viewBoxOf = (facts) => facts.viewBox.trim().split(/[\s,]+/).map(Number);

test('logo: co viewBox, khong the cam, href noi bo, id duy nhat, nhe', () => {
  for (const file of LOGOS) {
    const facts = svgFacts(logoDir + file);
    const box = viewBoxOf(facts);
    assert.equal(box.length, 4, `${file} viewBox`);
    assert.ok(box.every(Number.isFinite) && box[2] > 0 && box[3] > 0, `${file} viewBox = ${facts.viewBox}`);
    for (const tag of ['image', 'text', 'script', 'style', 'foreignObject']) {
      assert.ok(!facts.tags.has(tag), `${file} co the <${tag}>`);
    }
    const ids = facts.ids.map((x) => x.id);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], `${file} id trung`);
    assert.deepEqual(facts.hrefs.filter((h) => !h.startsWith('#')), [], `${file} co href ra ngoai`);
    assert.deepEqual(facts.hrefs.filter((h) => !ids.includes(h.slice(1))), [], `${file} href khong tro toi id nao`);
  }
});

// Size budgets follow the mascot each logo is built from: logo-full = the detailed mascot
// (mascot-layered.svg) + the two text outlines; logo-mono = one recolored copy of the logo mascot
// (mascot-logo.svg) inside a mask + the text, with a fixed overhead for the mask; logo-icon = the
// logo mascot's head (mascot-logo-head.svg) + the disc and the frame. The light versions are the
// same, logo-full-light with the sticker border too (one smooth path: about 3 KB).
const WORDMARK_BUDGET = 24 * 1024;
const MONO_OVERHEAD = 2 * 1024;
const ICON_OVERHEAD = 1024;
const STICKER_BUDGET = 6 * 1024;

test('logo: kich thuoc theo mascot nguon, khong lon theo so phan tu', () => {
  const [mascotBytes, logoMascotBytes, headBytes] = [mascotPath, logoMascotPath, logoMascotHeadPath].map(
    (file) => statSync(file).size,
  );
  const bytes = Object.fromEntries(LOGOS.map((file) => [file, svgFacts(logoDir + file).bytes]));
  assert.ok(bytes['logo-full.svg'] <= mascotBytes + WORDMARK_BUDGET, `logo-full ${bytes['logo-full.svg']} byte`);
  assert.ok(
    bytes['logo-mono.svg'] <= logoMascotBytes + WORDMARK_BUDGET + MONO_OVERHEAD,
    `logo-mono ${bytes['logo-mono.svg']} byte`,
  );
  assert.ok(bytes['logo-icon.svg'] <= headBytes + ICON_OVERHEAD, `logo-icon ${bytes['logo-icon.svg']} byte`);
  assert.ok(
    bytes['logo-full-light.svg'] <= mascotBytes + WORDMARK_BUDGET + STICKER_BUDGET,
    `logo-full-light ${bytes['logo-full-light.svg']} byte`,
  );
  assert.ok(
    bytes['logo-mono-light.svg'] <= logoMascotBytes + WORDMARK_BUDGET + MONO_OVERHEAD,
    `logo-mono-light ${bytes['logo-mono-light.svg']} byte`,
  );
});

test('logo: noi dung ve ra nam trong viewBox', () => {
  for (const file of LOGOS) {
    const [x, y, width, height] = viewBoxOf(svgFacts(logoDir + file));
    const box = visibleBBox(readFileSync(logoDir + file, 'utf8'));
    const where = `${file} ${JSON.stringify(box)}`;
    assert.ok(box.x >= x && box.y >= y, `tran trai/tren: ${where}`);
    assert.ok(box.x + box.width <= x + width && box.y + box.height <= y + height, `tran phai/duoi: ${where}`);
  }
});

test('logo-full, logo-full-light va logo-icon: moi mau thuoc bang mau', () => {
  const allowed = palette();
  for (const file of ['logo-full.svg', 'logo-full-light.svg', 'logo-icon.svg']) {
    const facts = svgFacts(logoDir + file);
    assert.deepEqual([...facts.colors].filter((c) => !allowed.has(c)), [], `${file} mau ngoai bang`);
    assert.equal(facts.maskColors.size, 0, `${file} co mau trong <mask>`);
  }
});

test('logo-mono / logo-mono-light: chi mot mau (Nau dat / Trang gao); mask chi trang / den', () => {
  const { color } = readTokens();
  for (const [file, ink] of [['logo-mono.svg', 'nau-dat'], ['logo-mono-light.svg', 'trang-gao']]) {
    const facts = svgFacts(logoDir + file);
    assert.deepEqual([...facts.colors], [color[ink].value.toLowerCase()], `${file} muc`);
    assert.deepEqual([...facts.maskColors].filter((c) => !['#ffffff', '#000000'].includes(c)), [], `${file} mau la trong mask`);
  }
});

// Elements in document order, with their own fill.
const flatFills = (node) =>
  node.children
    .filter((c) => c.type === 'element')
    .flatMap((c) => [{ name: c.name, fill: c.attributes.fill?.toLowerCase() }, ...flatFills(c)]);
const maskOf = (svg) => {
  const find = (node) => (node.name === 'mask' ? node : node.children?.map(find).find(Boolean));
  return find(parseSync(svg));
};

// The mask copies the logo mascot element by element, so element i of each mask is element i of
// the mascot. Light differs from logo-mono only in the ink color and in the hair (toc), which is
// ink in logo-mono and paper in logo-mono-light (the dark background shows as the hair, inside
// its Nâu đất outline, which stays ink).
test('logo-mono-light: nhu logo-mono, chi doi mau muc va toc thanh nen', () => {
  const { color } = readTokens();
  // Each logo has its own id prefix; compare without it.
  const [mono, light] = ['logo-mono.svg', 'logo-mono-light.svg'].map((file) =>
    readFileSync(logoDir + file, 'utf8').replace(/\r\n/g, '\n').replace(/nn-logo-mono(-light)?-/g, 'nn-'),
  );
  const outside = (svg) => svg.replace(/<mask[\s\S]*<\/mask>/, '');
  assert.equal(outside(light), outside(mono).replaceAll(color['nau-dat'].value, color['trang-gao'].value));
  const mascot = flatFills(parseSync(readFileSync(logoMascotPath, 'utf8')));
  const [monoMask, lightMask] = [mono, light].map((svg) => flatFills(maskOf(svg)).slice(1));
  assert.equal(monoMask.length, mascot.length);
  assert.equal(lightMask.length, mascot.length);
  const hair = color.toc.value.toLowerCase();
  let hairCount = 0;
  mascot.forEach((element, i) => {
    if (element.fill === hair) {
      hairCount++;
      assert.equal(monoMask[i].fill, '#ffffff', `logo-mono: toc #${i} phai la muc`);
      assert.equal(lightMask[i].fill, '#000000', `logo-mono-light: toc #${i} phai la nen`);
    } else {
      assert.deepEqual(lightMask[i], monoMask[i], `phan tu #${i} khac logo-mono`);
    }
  });
  assert.ok(hairCount > 0, 'logo mascot khong co toc');
});

// The text of a logo: its top-level paths after the mascot (title, then tagline).
const textFills = (file) => {
  const root = parseSync(readFileSync(logoDir + file, 'utf8'));
  const top = root.children.filter((c) => c.type === 'element');
  const after = top.slice(top.findIndex((c) => c.name === 'svg') + 1);
  return after.map((c) => c.attributes.fill.toLowerCase());
};

test('logo ban sang: mau chu va nen Nau dat la mot cap trong textPairs (dat AA)', () => {
  const { color, textPairs } = readTokens();
  const name = Object.fromEntries(Object.entries(color).map(([token, { value }]) => [value.toLowerCase(), token]));
  for (const file of ['logo-full-light.svg', 'logo-mono-light.svg']) {
    const fills = textFills(file);
    assert.equal(fills.length, 2, `${file}: tieu de + dong phu`);
    for (const fill of fills) {
      assert.ok(textPairs.some(([text, bg]) => text === name[fill] && bg === 'nau-dat'), `${file}: ${name[fill]} tren nau-dat`);
      assert.ok(contrast(fill, color['nau-dat'].value) >= 4.5, `${file}: ${name[fill]} duoi AA`);
    }
  }
});

test('logo-full-light: vien nhan dan la mot hinh tron tru, khong lo, sau mascot', () => {
  const root = parseSync(readFileSync(logoDir + 'logo-full-light.svg', 'utf8'));
  const [first, second] = root.children.filter((c) => c.type === 'element');
  assert.equal(first.name, 'path', 'vien phai ve truoc mascot');
  assert.equal(second.attributes.id, 'nn-logo-full-light-mascot');
  assert.equal(first.attributes.fill, readTokens().color['trang-gao'].value);
  assert.equal(first.attributes.d.match(/[Mm]/g).length, 1, 'vien phai la mot duong kin');
  const [vx, vy, vw, vh] = viewBoxOf(svgFacts(logoDir + 'logo-full-light.svg'));
  const alone = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}"><path d="${first.attributes.d}" fill="#000"/></svg>`;
  const { enclosed, pieces } = alphaFacts(alone, 1024);
  assert.equal(enclosed, 0, `${enclosed} px lo trong vien`);
  assert.equal(pieces.filter((n) => n > SPECK_PIXELS).length, 1);
});

const MONO_SCALE_WIDTH = 1024;
const DARK_TOLERANCE = 24;
const EDGE_RADIUS = 1;
const MAX_MONO_MISMATCH = 0.01;

// Pixels of the mascot area of the color logo mascot in the logo-mono frame (monoReference(); dark =
// Nâu đất or the black hair, or not) against the ink of logo-mono, rendered on the same grid. Mono must keep exactly the dark areas: a color area that
// turns solid dark, or a dark area that is lost, shows up as mismatching pixels. Antialiased edges differ by about one
// pixel between the two renders, so a pixel only counts when no pixel within EDGE_RADIUS of it in
// the other render agrees.
test('logo-mono: muc giong vung Nau dat cua logo mascot mau', async () => {
  const { monoReference } = await import('../build-logos.mjs');
  const full = svgFacts(logoDir + 'logo-full.svg');
  const mono = svgFacts(logoDir + 'logo-mono.svg');
  assert.equal(mono.viewBox, full.viewBox, 'logo-mono phai dung chung viewBox voi logo-full');
  const [vx, vy, vw] = viewBoxOf(mono);
  const render = (svg) => new Resvg(svg, { fitTo: { mode: 'width', value: MONO_SCALE_WIDTH } }).render();
  const reference = monoReference();
  const [a, b] = [render(reference), render(readFileSync(logoDir + 'logo-mono.svg', 'utf8'))];
  const { width, height } = a;
  const scale = width / vw;
  const area = parseSync(reference).children.find((child) => child.attributes?.id === 'mascot').attributes;
  const x0 = Math.max(0, Math.floor((Number(area.x) - vx) * scale));
  const y0 = Math.max(0, Math.floor((Number(area.y) - vy) * scale));
  const x1 = Math.min(width, Math.ceil((Number(area.x) + Number(area.width) - vx) * scale));
  const y1 = Math.min(height, Math.ceil((Number(area.y) + Number(area.height) - vy) * scale));
  const darks = [[0x4a, 0x2c, 0x1a], [0x22, 0x22, 0x22]];
  const isDark = new Uint8Array(width * height);
  const isInk = new Uint8Array(width * height);
  // .pixels copies the whole buffer on every read, so read each one once.
  const [pa, pb] = [a.pixels, b.pixels];
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    isDark[p] = pa[i + 3] >= 128 && darks.some((dark) => dark.every((c, k) => Math.abs(pa[i + k] - c) <= DARK_TOLERANCE));
    isInk[p] = pb[i + 3] >= 128;
  }
  const near = (mask, x, y, value) => {
    for (let dy = -EDGE_RADIUS; dy <= EDGE_RADIUS; dy++) {
      for (let dx = -EDGE_RADIUS; dx <= EDGE_RADIUS; dx++) {
        const [nx, ny] = [x + dx, y + dy];
        if (nx >= 0 && ny >= 0 && nx < width && ny < height && mask[ny * width + nx] === value) return true;
      }
    }
    return false;
  };
  let [darkCount, inkCount, extraInk, lostInk] = [0, 0, 0, 0];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = y * width + x;
      darkCount += isDark[p];
      inkCount += isInk[p];
      if (isInk[p] && !isDark[p] && !near(isDark, x, y, 1)) extraInk++;
      if (isDark[p] && !isInk[p] && !near(isInk, x, y, 1)) lostInk++;
    }
  }
  assert.ok(darkCount > 0, 'logo mascot khong co vung Nau dat');
  const ratio = (extraInk + lostInk) / darkCount;
  assert.ok(
    ratio <= MAX_MONO_MISMATCH,
    `lech ${(100 * ratio).toFixed(2)} % (muc thua ${extraInk}, muc mat ${lostInk}, Nau dat ${darkCount}, muc ${inkCount} px)`,
  );
});

const MONO_PROBE_HEAD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" stroke="#4A2C1A" stroke-linejoin="round">' +
  '<defs><path id="d" d="M0 0h10v10z"/></defs><g id="body" stroke-width="7">';
const monoProbe = (inner) => `${MONO_PROBE_HEAD}${inner}</g></svg>`;

test('logo-mono: bao loi voi thuoc tinh / the khong xu ly duoc', async () => {
  const { monoMascot } = await import('../build-logos.mjs');
  const bad = {
    opacity: '<path d="M0 0h9" fill="#4A2C1A" opacity="0.5"/>',
    'fill-opacity': '<path d="M0 0h9" fill="#4A2C1A" fill-opacity="0.5"/>',
    'stroke-opacity': '<path d="M0 0h9" fill="none" stroke-opacity="0.5"/>',
    'paint-order': '<path d="M0 0h9" fill="#F4CDA8" paint-order="stroke"/>',
    filter: '<path d="M0 0h9" fill="#F4CDA8" filter="url(#f)"/>',
    'style fill': '<path d="M0 0h9" style="fill: #F4CDA8"/>',
    'fill url': '<path d="M0 0h9" fill="url(#g)"/>',
    'mau ngoai bang': '<path d="M0 0h9" fill="#123456"/>',
    currentColor: '<path d="M0 0h9" fill="currentColor"/>',
    linearGradient: '<linearGradient id="g"/>',
    text: '<text>x</text>',
  };
  for (const [name, inner] of Object.entries(bad)) {
    assert.throws(() => monoMascot(monoProbe(inner)), /logo-mono/, name);
  }
});

test('logo-mono: giu nguyen hinh hoc, Nau dat va toc -> trang, mau khac -> den', async () => {
  const { monoMascot } = await import('../build-logos.mjs');
  const out = monoMascot(
    monoProbe(
      '<path d="M0 0h9" fill="none" stroke-dasharray="4 2" stroke-linecap="butt"/>' +
        '<path d="M0 0h9v9z" fill="#F4CDA8" fill-rule="evenodd"/>' +
        '<use href="#d" x="3" y="4" fill="#4A2C1A"/>' +
        '<path id="hair" d="M0 0h5v5z" fill="#222222"/>',
    ),
  );
  for (const kept of ['stroke-dasharray="4 2"', 'stroke-linecap="butt"', 'fill-rule="evenodd"', 'x="3"', 'y="4"']) {
    assert.ok(out.includes(kept), `mat ${kept}`);
  }
  assert.ok(out.includes('stroke="#FFFFFF"'), 'Nau dat (stroke goc) phai thanh trang');
  assert.ok(out.includes('fill="#000000"'), 'mau da phai thanh den');
  assert.ok(out.includes('<use href="#d" x="3" y="4" fill="#FFFFFF"'), 'use Nau dat phai thanh trang');
  assert.ok(out.includes('<path d="M0 0h5v5z" fill="#FFFFFF"'), 'toc (#222222) phai thanh trang nhu Nau dat');
  assert.ok(!/#4A2C1A|#F4CDA8/i.test(out.slice(out.indexOf('<mask'), out.indexOf('</mask>'))), 'con mau goc trong mask');
});

test('logo-icon: viewBox vuong, chi co dau', () => {
  const facts = svgFacts(logoDir + 'logo-icon.svg');
  const [, , width, height] = viewBoxOf(facts);
  assert.equal(width, height, `viewBox ${facts.viewBox}`);
  for (const id of ['body', 'rice', 'hands']) {
    assert.equal(facts.elements[id], undefined, `logo-icon co #${id}`);
  }
});

test('logo-full: giu nhom mascot (id co tien to) va pivot de lam dong', () => {
  const facts = svgFacts(logoDir + 'logo-full.svg');
  const mascot = svgFacts(mascotPath);
  const own = (id) => `nn-logo-full-${id}`;
  for (const id of ['body', 'rice', 'hands', 'head']) {
    const element = facts.elements[own(id)];
    assert.equal(element?.tag, 'g', `thieu g#${own(id)}`);
    const viewport = element.ancestors.map((a) => facts.elements[a]).find((e) => e.tag === 'svg');
    assert.equal(viewport?.attributes.viewBox, mascot.viewBox, `g#${own(id)} phai nam trong <svg> cua mascot`);
  }
  for (const id of Object.keys(ANIMATED)) {
    assert.equal(facts.elements[own(id)].attributes['data-pivot'], mascot.elements[id].attributes['data-pivot'], `${id} pivot`);
  }
});

test('logo: moi id co tien to cua logo, khong trung id giua cac logo va voi 2 mascot', () => {
  const idsOf = (file) => svgFacts(file).ids.map((x) => x.id);
  // The mascot files share #body, #rice, #hands, #head on purpose (same animation); a page inlines
  // one of them, so only the logos must not share an id with them or with each other.
  const mascotIds = new Set([mascotPath, logoMascotPath, logoMascotHeadPath].flatMap(idsOf));
  const seen = new Map();
  for (const file of LOGOS) {
    const prefix = `nn-${file.replace(/\.svg$/, '')}-`;
    for (const id of idsOf(logoDir + file)) {
      assert.ok(id.startsWith(prefix), `${file}: id "${id}" khong co tien to ${prefix}`);
      assert.ok(!mascotIds.has(id), `${file}: id "${id}" trung voi mascot`);
      assert.ok(!seen.has(id), `${file}: id "${id}" trung voi ${seen.get(id)}`);
      seen.set(id, file);
    }
  }
  assert.ok(seen.size > 0, 'logo khong co id nao');
});

test('logo sinh tu mascot hien tai (chay npm run logos sau khi sua mascot)', async () => {
  const { buildLogos } = await import('../build-logos.mjs');
  const built = buildLogos();
  assert.deepEqual(Object.keys(built).sort(), LOGOS);
  for (const file of LOGOS) {
    const onDisk = readFileSync(logoDir + file, 'utf8').replace(/\r\n/g, '\n');
    assert.ok(onDisk === built[file], `${file} cu, chay npm run logos`);
  }
});

test('svgFacts: svg long nhau co id la to tien, svg goc thi khong', () => {
  withTempSvg(
    '<svg id="root" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
      '<svg id="inner" viewBox="0 0 5 5"><g id="g"/></svg></svg>',
    (file) => {
      const f = svgFacts(file);
      assert.deepEqual(f.elements.inner.ancestors, []);
      assert.deepEqual(f.elements.g.ancestors, ['inner']);
    },
  );
});

test('svgFacts: mau trong <mask> tach rieng (maskColors), khong tinh la mau ve', () => {
  withTempSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><mask id="m"><g fill="#FFF"><path stroke="#000000"/></g></mask>' +
      '<rect width="10" height="10" fill="#4A2C1A" mask="url(#m)"/></svg>',
    (file) => {
      const f = svgFacts(file);
      assert.deepEqual([...f.colors], ['#4a2c1a']);
      assert.deepEqual([...f.maskColors].sort(), ['#000000', '#ffffff']);
    },
  );
});
