'use strict';
// File names in the output folder, and the rule that a diagram edited by hand is never overwritten: the new version
// goes to <slug>-v2, -v3, …
//
// "Edited by hand" is judged by content. Every build stores a snapshot of the scene it wrote (writeSnapshot); the
// next build compares the file on disk with it (sceneEdited) and ignores what an Excalidraw editor changes by itself
// when it opens a file: re-snapped bound arrows, re-measured text widths, new version numbers. Without a snapshot
// (a file built before snapshots existed, or on another machine) the file times decide: a .excalidraw newer than its
// PNG, or one with no PNG, counts as edited.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SHAPE_TOLERANCE = 8;   // px; a move this small is an accidental drag (seen: 5 px after testing in Obsidian)
const TEXT_TOLERANCE = 12;   // px; an editor re-measures text, which shifts a centred or right-aligned text a little
const STYLE_KEYS = ['strokeColor', 'backgroundColor', 'strokeStyle', 'fillStyle'];
const TEXT_KEYS = ['text', 'fontSize', 'fontFamily', 'textAlign'];

function snapshotDir() {
  return process.env.EXCALIDRAW_SNAPSHOT_DIR || path.join(__dirname, '..', '.built');
}

function snapshotPath(excalidrawFile) {
  let key = path.resolve(excalidrawFile);
  if (os.platform() === 'win32') key = key.toLowerCase();
  return path.join(snapshotDir(), `${crypto.createHash('sha1').update(key).digest('hex')}.json`);
}

function writeSnapshot(excalidrawFile, scene) {
  fs.mkdirSync(snapshotDir(), { recursive: true });
  fs.writeFileSync(snapshotPath(excalidrawFile), JSON.stringify({ file: path.resolve(excalidrawFile), elements: scene.elements }));
}

const near = (a, b, tol) => Math.abs((a || 0) - (b || 0)) <= tol;
const textAnchorX = t => (t.textAlign === 'center' ? t.x + t.width / 2 : t.textAlign === 'right' ? t.x + t.width : t.x);
const bound = e => e.type === 'arrow' && (e.startBinding || e.endBinding);

function elementEdited(now, was) {
  if (now.type !== was.type) return true;
  if (STYLE_KEYS.some(k => now[k] !== was[k])) return true;
  if (now.type === 'text') {
    return TEXT_KEYS.some(k => now[k] !== was[k])
      || !near(textAnchorX(now), textAnchorX(was), TEXT_TOLERANCE) || !near(now.y, was.y, TEXT_TOLERANCE);
  }
  if (bound(now) || bound(was)) {
    // an editor re-routes a bound arrow by itself; only what it connects counts
    const ends = e => [e.startBinding && e.startBinding.elementId, e.endBinding && e.endBinding.elementId].join('→');
    return ends(now) !== ends(was);
  }
  if (!near(now.x, was.x, SHAPE_TOLERANCE) || !near(now.y, was.y, SHAPE_TOLERANCE)) return true;
  if (now.points || was.points) {
    const p = now.points || [];
    const q = was.points || [];
    return p.length !== q.length || p.some(([x, y], i) => !near(x, q[i][0], SHAPE_TOLERANCE) || !near(y, q[i][1], SHAPE_TOLERANCE));
  }
  return !near(now.width, was.width, SHAPE_TOLERANCE) || !near(now.height, was.height, SHAPE_TOLERANCE);
}

function sceneEdited(onDisk, built) {
  const live = s => new Map(s.elements.filter(e => !e.isDeleted).map(e => [e.id, e]));
  const now = live(onDisk);
  const was = live(built);
  if (now.size !== was.size) return true;
  for (const [id, e] of now) {
    if (!was.has(id) || elementEdited(e, was.get(id))) return true;
  }
  return false;
}

function editedByHand(dir, slug) {
  const excalidraw = path.join(dir, `${slug}.excalidraw`);
  const png = path.join(dir, `${slug}.png`);
  if (!fs.existsSync(excalidraw)) return false;
  const snap = snapshotPath(excalidraw);
  if (fs.existsSync(snap)) {
    try {
      return sceneEdited(JSON.parse(fs.readFileSync(excalidraw, 'utf8')), JSON.parse(fs.readFileSync(snap, 'utf8')));
    } catch (e) {
      return true; // unreadable file: never overwrite it
    }
  }
  if (!fs.existsSync(png)) return true;
  return fs.statSync(excalidraw).mtimeMs > fs.statSync(png).mtimeMs;
}

// overwrite: the user said the edited file may be replaced
function outputPaths(dir, slug, { overwrite = false } = {}) {
  if (!SLUG.test(slug)) throw new Error(`slug must be kebab-case (a-z, 0-9, -): "${slug}"`);
  let s = slug;
  if (!overwrite) for (let v = 2; editedByHand(dir, s); v++) s = `${slug}-v${v}`;
  return {
    slug: s,
    excalidraw: path.join(dir, `${s}.excalidraw`),
    png: path.join(dir, `${s}.png`),
    embed: `![[${s}.png]]`,
  };
}

module.exports = { outputPaths, editedByHand, sceneEdited, writeSnapshot, snapshotPath };
