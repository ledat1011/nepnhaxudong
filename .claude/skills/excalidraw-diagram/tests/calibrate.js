'use strict';
// Measures the real glyph width of Excalifont and Nunito with the real renderer and prints the
// CHAR_FACTOR to use in lib/measure.js. Run by hand: node tests/calibrate.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const kit = require('../lib/kit');
const { render } = require('../lib/render');
const { CHAR_FACTOR } = require('../lib/measure');

const SAMPLES = [
  'StoryPublishingService', 'story-published topic', 'PostgreSQL stories table',
  'DRAFT → PUBLISHING → PUBLISHED', 'checks every ~60 s until all', 'WEBSITE ADMIN MEDIA',
  'PUBLISHED ARCHIVED ERROR', 'Next.js PostgreSQL', 'Spring Boot admin-api', 'iiii llll 1111',
];
const SIZE = 20;

(async () => {
  const fonts = { hand: kit.FONT.hand, plain: kit.FONT.plain };
  const d = kit.createDiagram();
  Object.keys(fonts).forEach((font, fi) => {
    SAMPLES.forEach((s, i) => d.note({ x: fi * 900, y: i * 60, w: 800, text: s, size: SIZE, font }));
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calibrate-'));
  const r = await render(d.save(path.join(dir, 'calibrate.excalidraw')), path.join(dir, 'calibrate.png'), { scale: 1 });
  Object.entries(fonts).forEach(([font, family], fi) => {
    const widths = r.textWidths.slice(fi * SAMPLES.length, (fi + 1) * SAMPLES.length);
    const ratios = widths.map((w, i) => w / ([...SAMPLES[i]].length * SIZE));
    const max = Math.max(...ratios);
    console.log(`${font} (fontFamily ${family}): max ratio ${max.toFixed(3)}, current CHAR_FACTOR ${CHAR_FACTOR[family]}, `
      + `use ${Math.ceil(max * 1.05 * 100) / 100}`);
  });
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
