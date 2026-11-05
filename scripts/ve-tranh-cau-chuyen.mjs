#!/usr/bin/env node
// Draws story cover images in the semi-realistic manhua style of decision 0011
// (docs/decisions/0011-minh-hoa-cau-chuyen-manhua.md) with the Gemini image API.
//
// Usage:
//   node scripts/ve-tranh-cau-chuyen.mjs                 draws the 3 test covers
//   node scripts/ve-tranh-cau-chuyen.mjs "<scene>" ...   draws one cover per scene
//   node scripts/ve-tranh-cau-chuyen.mjs --dry-run       prints the prompts, calls nothing
//
// Reads the key from GEMINI_API_KEY. Model: GEMINI_IMAGE_MODEL (default below).
// Writes to data/tranh-cau-chuyen/ (ignored by git). Images do not go into the repo.
// If ImageMagick is installed, it also writes a 1600 px wide WebP for upload.

import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const OUT_DIR = join(import.meta.dirname, '..', 'data', 'tranh-cau-chuyen');

// The 3 test scenes are the examples in decision 0011.
const TEST_SCENES = [
  'a farmer cutting golden yellow-flower sticky rice with a sickle at harvest time',
  'hands winnowing sticky rice grains in a round bamboo tray',
  'a family sharing a tray of steamed sticky rice in a wooden house',
];

// Same text as the prompt template in decision 0011. Keep the two in sync.
export function buildPrompt(scene) {
  return [
    'Semi-realistic Chinese manhua illustration, wuxia comic style.',
    'Confident black ink linework with dry-brush strokes, detailed faces and cloth folds,',
    'soft grey ink-wash background that fades to off-white paper (#FBF7EE), loose splatter at the edges.',
    'Limited warm palette: earth brown (#4A2C1A, #8B5A2B), golden rice (#D9A13B), straw (#F2E2B6),',
    'a small touch of young-rice green (#6E8B3D). No other strong colours.',
    `Scene: ${scene}, in the countryside of Hải Dương, northern Vietnam.`,
    'People wear Vietnamese brown peasant clothes (áo nâu) and conical hats (nón lá). No armour, no weapons.',
    'Wide 16:9 composition, main subject on one side, calm empty space on the other side.',
    'No text, no letters, no watermark, no logo.',
  ].join('\n');
}

async function drawOne(scene, model, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(scene) }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${body?.error?.message ?? 'no error message'}`);
  }
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  const image = parts.find((p) => p.inlineData?.data);
  if (!image) {
    const reason = body?.candidates?.[0]?.finishReason ?? body?.promptFeedback?.blockReason ?? 'unknown';
    throw new Error(`no image in the reply (reason: ${reason})`);
  }
  return { mime: image.inlineData.mimeType, bytes: Buffer.from(image.inlineData.data, 'base64') };
}

function toWebp(src, dest) {
  for (const cmd of [['magick', [src]], ['convert', [src]]]) {
    // The model gives about 1344x768 (not exactly 16:9). Fill 1600x900, then crop the centre.
    const r = spawnSync(cmd[0], [
      ...cmd[1], '-resize', '1600x900^', '-gravity', 'center', '-extent', '1600x900', '-quality', '82', dest,
    ]);
    if (r.status === 0) return true;
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const scenes = args.filter((a) => a !== '--dry-run');
  const list = scenes.length > 0 ? scenes : TEST_SCENES;

  if (dryRun) {
    list.forEach((s, i) => console.log(`--- ${i + 1} ---\n${buildPrompt(s)}\n`));
    return;
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('GEMINI_API_KEY is not set. Add it to the environment, then run again.');
    process.exit(2);
  }
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  await mkdir(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

  let failed = 0;
  for (const [i, scene] of list.entries()) {
    const name = `bia-${stamp}-${i + 1}`;
    try {
      const { mime, bytes } = await drawOne(scene, model, key);
      const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
      const raw = join(OUT_DIR, `${name}.${ext}`);
      await writeFile(raw, bytes);
      const webp = join(OUT_DIR, `${name}.webp`);
      console.log(`${i + 1}. ${raw}`);
      console.log(toWebp(raw, webp) ? `   ${webp}` : '   (no ImageMagick: WebP not written)');
    } catch (err) {
      failed += 1;
      console.error(`${i + 1}. failed: ${err.message}`);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
