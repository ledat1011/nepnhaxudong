import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCss } from '../build-tokens.mjs';
import { contentBBox, contrast, palette, rotateGroups, svgFacts, visibleBBox } from '../lib/svg-check.mjs';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

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
const LOGOS = ['logo-full.svg', 'logo-icon.svg', 'logo-mono.svg'];
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

// Size budget follows the mascot (whose own test caps it at 40 KB): logo-full = mascot + the two
// text outlines; logo-mono = one recolored copy of the same mascot inside a mask, so it may not grow
// past logo-full by more than a fixed overhead; logo-icon is part of the head.
const WORDMARK_BUDGET = 24 * 1024;
const MONO_OVERHEAD = 2 * 1024;

test('logo: kich thuoc theo mascot, khong lon theo so phan tu', () => {
  const mascotBytes = statSync(mascotPath).size;
  const bytes = Object.fromEntries(LOGOS.map((file) => [file, svgFacts(logoDir + file).bytes]));
  assert.ok(bytes['logo-full.svg'] <= mascotBytes + WORDMARK_BUDGET, `logo-full ${bytes['logo-full.svg']} byte`);
  assert.ok(bytes['logo-mono.svg'] <= bytes['logo-full.svg'] + MONO_OVERHEAD, `logo-mono ${bytes['logo-mono.svg']} byte`);
  assert.ok(bytes['logo-icon.svg'] <= mascotBytes, `logo-icon ${bytes['logo-icon.svg']} byte`);
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

test('logo-full va logo-icon: moi mau thuoc bang mau', () => {
  const allowed = palette();
  for (const file of ['logo-full.svg', 'logo-icon.svg']) {
    const facts = svgFacts(logoDir + file);
    assert.deepEqual([...facts.colors].filter((c) => !allowed.has(c)), [], `${file} mau ngoai bang`);
    assert.equal(facts.maskColors.size, 0, `${file} co mau trong <mask>`);
  }
});

test('logo-mono: chi mot mau Nau dat; mask chi trang / den', () => {
  const facts = svgFacts(logoDir + 'logo-mono.svg');
  assert.deepEqual([...facts.colors], ['#4a2c1a']);
  assert.deepEqual([...facts.maskColors].filter((c) => !['#ffffff', '#000000'].includes(c)), [], 'mau la trong mask');
});

const MONO_SCALE_WIDTH = 1024;
const DARK_TOLERANCE = 24;
const EDGE_RADIUS = 1;
const MAX_MONO_MISMATCH = 0.01;

// Pixels of the mascot area of logo-full (Nâu đất or not) against the ink of logo-mono, rendered on
// the same grid. Mono must keep exactly the Nâu đất areas: a color area that turns solid dark, or a
// dark area that is lost, shows up as mismatching pixels. Antialiased edges differ by about one
// pixel between the two renders, so a pixel only counts when no pixel within EDGE_RADIUS of it in
// the other render agrees.
test('logo-mono: muc giong vung Nau dat cua logo-full', () => {
  const full = svgFacts(logoDir + 'logo-full.svg');
  const mono = svgFacts(logoDir + 'logo-mono.svg');
  assert.equal(mono.viewBox, full.viewBox, 'logo-mono phai dung chung viewBox voi logo-full');
  const [vx, vy, vw] = viewBoxOf(full);
  const render = (file) =>
    new Resvg(readFileSync(logoDir + file, 'utf8'), { fitTo: { mode: 'width', value: MONO_SCALE_WIDTH } }).render();
  const [a, b] = [render('logo-full.svg'), render('logo-mono.svg')];
  const { width, height } = a;
  const scale = width / vw;
  const area = full.elements.mascot.attributes;
  const x0 = Math.max(0, Math.floor((Number(area.x) - vx) * scale));
  const y0 = Math.max(0, Math.floor((Number(area.y) - vy) * scale));
  const x1 = Math.min(width, Math.ceil((Number(area.x) + Number(area.width) - vx) * scale));
  const y1 = Math.min(height, Math.ceil((Number(area.y) + Number(area.height) - vy) * scale));
  const dark = [0x4a, 0x2c, 0x1a];
  const isDark = new Uint8Array(width * height);
  const isInk = new Uint8Array(width * height);
  // .pixels copies the whole buffer on every read, so read each one once.
  const [pa, pb] = [a.pixels, b.pixels];
  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    isDark[p] = pa[i + 3] >= 128 && dark.every((c, k) => Math.abs(pa[i + k] - c) <= DARK_TOLERANCE);
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
  assert.ok(darkCount > 0, 'logo-full khong co vung Nau dat');
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

test('logo-mono: giu nguyen hinh hoc, chi doi mau Nau dat -> trang, mau khac -> den', async () => {
  const { monoMascot } = await import('../build-logos.mjs');
  const out = monoMascot(
    monoProbe(
      '<path d="M0 0h9" fill="none" stroke-dasharray="4 2" stroke-linecap="butt"/>' +
        '<path d="M0 0h9v9z" fill="#F4CDA8" fill-rule="evenodd"/>' +
        '<use href="#d" x="3" y="4" fill="#4A2C1A"/>',
    ),
  );
  for (const kept of ['stroke-dasharray="4 2"', 'stroke-linecap="butt"', 'fill-rule="evenodd"', 'x="3"', 'y="4"']) {
    assert.ok(out.includes(kept), `mat ${kept}`);
  }
  assert.ok(out.includes('stroke="#FFFFFF"'), 'Nau dat (stroke goc) phai thanh trang');
  assert.ok(out.includes('fill="#000000"'), 'mau da phai thanh den');
  assert.ok(out.includes('<use href="#d" x="3" y="4" fill="#FFFFFF"'), 'use Nau dat phai thanh trang');
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

test('logo-full: giu nhom mascot va pivot de lam dong', () => {
  const facts = svgFacts(logoDir + 'logo-full.svg');
  const mascot = svgFacts(mascotPath);
  for (const id of ['body', 'rice', 'hands', 'head']) {
    const element = facts.elements[id];
    assert.equal(element?.tag, 'g', `thieu g#${id}`);
    const viewport = element.ancestors.map((a) => facts.elements[a]).find((e) => e.tag === 'svg');
    assert.equal(viewport?.attributes.viewBox, mascot.viewBox, `g#${id} phai nam trong <svg> cua mascot`);
  }
  for (const id of Object.keys(ANIMATED)) {
    assert.equal(facts.elements[id].attributes['data-pivot'], mascot.elements[id].attributes['data-pivot'], `${id} pivot`);
  }
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
