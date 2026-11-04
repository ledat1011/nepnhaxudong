// Tai Pacifico va Quicksand tu Google Fonts vao brand/fonts/.
// Chay: node fetch-fonts.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isDirectRun } from './lib/run.mjs';

const outDir = fileURLToPath(new URL('../fonts/', import.meta.url));

const CSS_URLS = {
  Pacifico: 'https://fonts.googleapis.com/css2?family=Pacifico',
  Quicksand: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;700',
};
const OFL_BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/';

async function get(url) {
  // Khong gui User-Agent trinh duyet de Google tra ve TTF day du.
  const res = await fetch(url, { headers: { 'User-Agent': 'node' } });
  if (res.status !== 200) throw new Error(`HTTP ${res.status} khi tai ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// Moi khoi @font-face -> { weight, url, format }.
export function parseFontFaces(css) {
  const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  return blocks.map((block) => ({
    weight: /font-weight:\s*(\d+)/.exec(block)?.[1],
    url: /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(block)?.[1],
    format: /format\('([^']+)'\)/.exec(block)?.[1],
    ranged: /unicode-range/.test(block),
  }));
}

async function fetchFamily(family, outName) {
  const css = (await get(CSS_URLS[family])).toString('utf8');
  const faces = parseFontFaces(css);
  const byWeight = new Map();
  for (const face of faces) {
    if (!face.url || face.format !== 'truetype' || face.ranged) {
      throw new Error(`${family}: CSS tra ve file chia theo unicode-range hoac khong phai TTF: ${JSON.stringify(face)}`);
    }
    if (byWeight.has(face.weight)) throw new Error(`${family}: trung weight ${face.weight}`);
    byWeight.set(face.weight, face.url);
  }
  for (const [weight, url] of byWeight) {
    const name = outName(weight);
    writeFileSync(outDir + name, await get(url));
    console.log('ghi', name);
  }
  return byWeight;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const pacifico = await fetchFamily('Pacifico', () => 'Pacifico-Regular.ttf');
  if (pacifico.size !== 1) throw new Error('Pacifico: can dung 1 file');
  const quicksand = await fetchFamily('Quicksand', (w) => `Quicksand-${w}.ttf`);
  for (const w of ['400', '500', '700']) {
    if (!quicksand.has(w)) throw new Error(`Quicksand: thieu weight ${w}`);
  }
  for (const [dir, name] of [['pacifico', 'OFL-Pacifico.txt'], ['quicksand', 'OFL-Quicksand.txt']]) {
    writeFileSync(outDir + name, await get(`${OFL_BASE}${dir}/OFL.txt`));
    console.log('ghi', name);
  }
}

if (isDirectRun(import.meta.url)) {
  main().catch((err) => {
    console.error('Loi:', err.message);
    process.exit(1);
  });
}
