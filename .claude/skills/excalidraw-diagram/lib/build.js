'use strict';
// Builds every diagram a <name>.diagram.js returns: lint → PNG → .excalidraw, into the output folder,
// plus a copy of the script so the diagram can be regenerated later.
// A .diagram.js exports  kit => [{ slug, diagram }]  (SKILL.md, "Write the script").
const fs = require('fs');
const os = require('os');
const path = require('path');
const kit = require('./kit');
const { check, format } = require('./check');
const { render } = require('./render');
const { outputPaths, writeSnapshot } = require('./save');

// Errors from inside the script (syntax error, TypeError, ...) get the script name in the message and keep
// the original stack, which holds the .diagram.js line.
function inScript(script, fn) {
  try {
    return fn();
  } catch (e) {
    const wrapped = new Error(`${script}: ${e.message}`, { cause: e });
    wrapped.stack = `${wrapped.stack}\nCaused by: ${e.stack}`;
    throw wrapped;
  }
}

function loadScript(script) {
  const file = path.resolve(script);
  delete require.cache[file];
  const factory = inScript(script, () => require(file));
  if (typeof factory !== 'function') throw new Error(`${script} must export a function: kit => [{ slug, diagram }]`);
  const list = inScript(script, () => factory(kit));
  if (!Array.isArray(list) || list.length === 0) throw new Error(`${script} must return a non-empty array of { slug, diagram }`);
  return list;
}

// overwrite: replace a diagram even if it was edited by hand — only when the user said so
async function build({ script, out, scale = 2, overwrite = false }) {
  const list = loadScript(script);
  const outDir = path.resolve(out || path.dirname(script));
  fs.mkdirSync(outDir, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excalidraw-build-'));
  const results = [];
  try {
    for (const { slug, diagram } of list) {
      const paths = outputPaths(outDir, slug, { overwrite });
      const scene = diagram.scene();
      const report = check(scene);
      const json = JSON.stringify(scene, null, 2);
      const tmp = path.join(tmpDir, `${paths.slug}.excalidraw`);
      fs.writeFileSync(tmp, json);
      await render(tmp, paths.png, { scale });
      fs.writeFileSync(paths.excalidraw, json);
      writeSnapshot(paths.excalidraw, scene);
      // without a snapshot (older builds) save.js falls back to file times, so the PNG must stay at least as new as the .excalidraw: a newer .excalidraw means a hand edit (save.js).
      // Date.now() can run behind the file-system clock, so the .excalidraw's own mtime is the floor.
      const stamp = new Date(Math.ceil(Math.max(Date.now(), fs.statSync(paths.excalidraw).mtimeMs)) + 1);
      fs.utimesSync(paths.png, stamp, stamp);
      results.push({ ...paths, report, anim: copyAnim(script, slug, outDir, paths.slug) });
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  const scriptCopy = path.join(outDir, path.basename(script));
  if (path.resolve(script) !== scriptCopy) fs.copyFileSync(script, scriptCopy);
  return results.map(r => ({ ...r, script: scriptCopy }));
}

// A GIF's <slug>.anim.js next to the script goes with the diagram, under the slug actually written (-v2 after a
// hand edit), so lib/gif/animate.js finds the PNG it belongs to. Returns its path, or null when there is none.
function copyAnim(script, slug, outDir, writtenSlug) {
  const src = path.join(path.dirname(path.resolve(script)), `${slug}.anim.js`);
  if (!fs.existsSync(src)) return null;
  const dest = path.join(outDir, `${writtenSlug}.anim.js`);
  if (src !== dest) fs.copyFileSync(src, dest);
  return dest;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const option = flag => {
    const i = args.indexOf(flag);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const out = option('--out');
  const scale = Number(option('--scale') || 2);
  const at = args.indexOf('--overwrite');
  const overwrite = at >= 0;
  if (overwrite) args.splice(at, 1);
  const [script] = args;
  if (!script) {
    console.error('usage: node build.js <name>.diagram.js [--out <folder>] [--scale 2] [--overwrite]');
    process.exit(2);
  }
  build({ script, out, scale, overwrite })
    .then(results => {
      for (const r of results) {
        console.log(`== ${r.slug} ==`);
        console.log(format(r.report));
        console.log(`excalidraw ${r.excalidraw}\npng        ${r.png}\nembed      ${r.embed}`);
        if (r.anim) console.log(`anim       ${r.anim}`);
      }
      console.log(`script     ${results[0].script}`);
      process.exit(results.some(r => r.report.errors.length) ? 1 : 0);
    })
    .catch(e => {
      console.error(e.stack);
      process.exit(1);
    });
}

module.exports = { build };
