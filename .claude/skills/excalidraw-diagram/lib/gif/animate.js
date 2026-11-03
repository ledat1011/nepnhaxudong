'use strict';
// Turns a built diagram (<slug>.png + <slug>.excalidraw) into an animated GIF: icons travel along the
// arrows, a ring pulses on each component that receives something, counters count arrivals.
// The motion comes from <slug>.anim.js next to the PNG (see references/animation.md for its API).
// usage: node lib/gif/animate.js <slug>.anim.js [--preview 1.5,4,8] [--width 1600] [--fps 25] [--out <file.gif>]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { need } = require('./packages');

let canvasLib;
let gifenc;
try {
  canvasLib = need('@napi-rs/canvas');
  gifenc = need('gifenc');
} catch (e) {
  console.error(`ERROR ${e.message}`);
  process.exit(1);
}
const { createCanvas, loadImage } = canvasLib;
const { GIFEncoder, quantize } = gifenc;
const { loadScene } = require('./scene');
const { ICONS, roundRect } = require('./icons');

const DEFAULTS = {
  width: 1600,        // GIF width in px; 1600 keeps the smallest diagram text readable
  fps: 25,
  speed: 600,         // diagram units per second
  fade: 0.18,         // s, icons fade and shrink in / out at both ends of a trip
  pulse: 0.65,        // s, ring on the component that receives an icon
  iconScale: 1.3,     // icon size at 1600 px wide
  hold: 1.6,          // s, the final state stays before the loop starts again
};
const MIN_TRIP = 0.45;  // s, even a very short arrow takes this long, so the eye can follow it

function parseArgs(argv) {
  const args = { spec: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--preview') args.preview = argv[++i].split(',').map(Number);
    else if (a === '--width') args.width = Number(argv[++i]);
    else if (a === '--fps') args.fps = Number(argv[++i]);
    else if (a === '--out') args.out = argv[++i];
    else args.spec = a;
  }
  if (!args.spec || !args.spec.endsWith('.anim.js')) {
    console.error('usage: node lib/gif/animate.js <slug>.anim.js [--preview t1,t2] [--width 1600] [--fps 25] [--out file.gif]');
    process.exit(2);
  }
  return args;
}

// ---------- path helpers given to the .anim.js ----------
const len = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const reverse = pts => [...pts].reverse();
function join(...parts) {
  const out = [];
  parts.flat().forEach(p => {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 0.5) out.push(p);
  });
  return out;
}
// continue past the end (d > 0) into the component the arrow points at, so the icon lands inside it;
// a negative d cuts the end off instead
function extend(pts, d) {
  if (d < 0) return cut(pts, len(pts) + d);
  const [a, b] = pts.slice(-2);
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [...pts, [b[0] + (b[0] - a[0]) / l * d, b[1] + (b[1] - a[1]) / l * d]];
}
// start earlier (d > 0): from inside the component the arrow leaves
const extendStart = (pts, d) => reverse(extend(reverse(pts), d));
function cut(pts, keep) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (keep <= l) {
      const k = l ? keep / l : 0;
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]);
      return out;
    }
    keep -= l;
    out.push(pts[i]);
  }
  return out;
}
function pointAt(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const l = Math.hypot(bx - ax, by - ay);
    if (d <= l || i === pts.length - 1) {
      const k = l ? Math.min(1, d / l) : 0;
      return [ax + (bx - ax) * k, ay + (by - ay) * k];
    }
    d -= l;
  }
  return pts[pts.length - 1];
}
const ease = t => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

// ---------- timeline built by the .anim.js ----------
function buildTimeline(scene, specFn, cfg) {
  const trips = [];
  const pulses = [];
  const counters = new Map();
  const settings = { hold: cfg.hold, speed: cfg.speed };
  const api = {
    arrow: (from, to) => scene.arrow(from, to),
    node: name => ({ ...scene.component(name).box }),
    center: name => {
      const b = scene.component(name).box;
      return [b.x + b.w / 2, b.y + b.h / 2];
    },
    reverse, join, extend, extendStart, length: len,
    // an icon travels along `points`, starting at t0 (s); returns its arrival time
    trip(icon, points, t0, { to, speed, color, fill, label } = {}) {
      if (!ICONS[icon]) throw new Error(`unknown icon "${icon}"; known: ${Object.keys(ICONS).join(', ')}`);
      if (!Array.isArray(points) || points.length < 2) throw new Error(`trip("${icon}") needs at least 2 points`);
      const t1 = t0 + Math.max(MIN_TRIP, len(points) / (speed || settings.speed));
      const ring = color || ICONS[icon].color;
      trips.push({ icon, points, t0, t1, color: ring, fill, label });
      if (to) pulses.push({ box: api.node(to), t: t1 - cfg.fade * 0.5, color: ring });
      return t1;
    },
    pulse(name, t, color = '#7048e8') { pulses.push({ box: api.node(name), t, color }); },
    // a "n / total" badge on the top-right corner of a component; each call adds one at time t
    count(name, t, { total, color = '#2f9e44' } = {}) {
      if (!counters.has(name)) counters.set(name, { box: api.node(name), times: [], total, color });
      const c = counters.get(name);
      c.times.push(t);
      if (total) c.total = total;
    },
    settings,
  };
  specFn(api);
  if (!trips.length) throw new Error('the .anim.js added no trip');
  for (const c of counters.values()) if (!c.total) c.total = c.times.length;
  const last = Math.max(...trips.map(t => t.t1), ...pulses.map(p => p.t + cfg.pulse), ...[...counters.values()]
    .flatMap(c => c.times));
  const loop = Math.ceil((last + settings.hold) * 2) / 2;
  return { trips, pulses, counters: [...counters.values()], loop, badgesOut: [loop - 0.8, loop - 0.35] };
}

// ---------- drawing ----------
function makeDrawer(scene, tl, cfg, S) {
  const px = ([x, y]) => [(x + scene.origin.x) * S, (y + scene.origin.y) * S];
  const iconSize = cfg.iconScale * cfg.width / 1600;
  const order = ['dot', 'doc', 'list', 'bolt', 'fail', 'answer', 'letter'];
  const trips = [...tl.trips].sort((a, b) => order.indexOf(a.icon) - order.indexOf(b.icon));

  function drawTrip(ctx, tr, t) {
    if (t < tr.t0 || t > tr.t1) return;
    const k = ease((t - tr.t0) / (tr.t1 - tr.t0));
    const [x, y] = px(pointAt(tr.points, k * len(tr.points)));
    const a = Math.max(0, Math.min(1, (t - tr.t0) / cfg.fade, (tr.t1 - t) / cfg.fade));
    const s = iconSize * (0.55 + 0.45 * a);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = a * 0.18;   // soft shadow, so icons stay visible on coloured boxes
    ctx.beginPath();
    ctx.ellipse(1.5, 2.5, 16, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.globalAlpha = a;
    const icon = ICONS[tr.icon];
    icon.draw(ctx, tr.color, { ...icon, fillOverride: tr.fill });
    ctx.restore();
    if (tr.label) drawTripLabel(ctx, tr, x, y, a);
  }
  // a small pill with the trip's text, travelling up-right of the icon, so the moving item says what it is
  function drawTripLabel(ctx, tr, x, y, a) {
    const k = cfg.width / 1600;
    const fontPx = Math.round(15 * k);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `bold ${fontPx}px Arial`;
    const w = ctx.measureText(tr.label).width + 14 * k;
    const h = fontPx + 10 * k;
    const lx = x + iconSize * 14;
    const ly = y - iconSize * 14 - h;
    roundRect(ctx, lx, ly, w, h, h / 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2 * k;
    ctx.strokeStyle = tr.color;
    ctx.stroke();
    ctx.fillStyle = tr.color;
    ctx.textBaseline = 'middle';
    ctx.fillText(tr.label, lx + 7 * k, ly + h / 2 + 1);
    ctx.restore();
  }
  function drawPulse(ctx, p, t) {
    const k = (t - p.t) / cfg.pulse;
    if (k < 0 || k > 1) return;
    const pad = 4 + 16 * (1 - (1 - k) * (1 - k));
    const [x0, y0] = px([p.box.x - pad, p.box.y - pad]);
    const [x1, y1] = px([p.box.x + p.box.w + pad, p.box.y + p.box.h + pad]);
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - k);
    roundRect(ctx, x0, y0, x1 - x0, y1 - y0, 12);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = p.color;
    ctx.stroke();
    ctx.restore();
  }
  function drawBadge(ctx, c, t) {
    const n = c.times.filter(x => x <= t).length;
    if (!n) return;
    const [o0, o1] = tl.badgesOut;
    const a = t > o0 ? Math.max(0, 1 - (t - o0) / (o1 - o0)) : 1;
    if (a <= 0) return;
    const [cx, cy] = px([c.box.x + c.box.w, c.box.y]);
    const label = `${n} / ${c.total}`;
    const bw = 18 + label.length * 9;
    ctx.save();
    ctx.globalAlpha = a;
    roundRect(ctx, cx - bw + 14, cy - 13, bw, 26, 13);
    ctx.fillStyle = c.color;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx - bw / 2 + 14, cy + 1);
    ctx.restore();
  }
  return (ctx, bg, t) => {
    ctx.drawImage(bg, 0, 0);
    tl.pulses.forEach(p => drawPulse(ctx, p, t));
    tl.counters.forEach(c => drawBadge(ctx, c, t));
    trips.forEach(tr => drawTrip(ctx, tr, t));
  };
}

// ---------- palette and GIF ----------
const TRANSPARENT = 255;   // palette index meaning "same pixel as the frame before"
function buildPalette(sample, tl) {
  const pal = quantize(sample, 224, { format: 'rgb565' });
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const keys = new Set(['#ffffff', '#000000', '#1e1e1e', '#e03131', '#ffd43b',
    ...Object.values(ICONS).map(i => i.color), ...tl.trips.map(t => t.color), ...tl.counters.map(c => c.color)]);
  // exact icon colours plus their tints over white, so rings and fades do not band
  keys.forEach(h => [1, 0.7, 0.45, 0.25].forEach(a => {
    if (pal.length < TRANSPARENT) pal.push(hex(h).map(v => Math.round(v * a + 255 * (1 - a))));
  }));
  while (pal.length < TRANSPARENT) pal.push([255, 255, 255]);
  pal.length = TRANSPARENT;
  pal.push([255, 0, 255]);
  return pal;
}
function nearestIndex(pal) {
  const cache = new Int16Array(1 << 24).fill(-1);
  return (r, g, b) => {
    const key = (r << 16) | (g << 8) | b;
    let idx = cache[key];
    if (idx >= 0) return idx;
    let best = Infinity;
    for (let i = 0; i < TRANSPARENT; i++) {
      const dr = pal[i][0] - r;
      const dg = pal[i][1] - g;
      const db = pal[i][2] - b;
      const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (dist < best) { best = dist; idx = i; }
    }
    cache[key] = idx;
    return idx;
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = { ...DEFAULTS, ...(args.width && { width: args.width }), ...(args.fps && { fps: args.fps }) };
  const specFile = path.resolve(args.spec);
  const base = specFile.replace(/\.anim\.js$/, '');
  for (const f of [`${base}.png`, `${base}.excalidraw`]) {
    if (!fs.existsSync(f)) throw new Error(`missing ${f}: build the diagram first with lib/build.js`);
  }
  const scene = loadScene(`${base}.excalidraw`);
  const tl = buildTimeline(scene, require(specFile), cfg);
  const S = cfg.width / scene.size.w;
  const W = cfg.width;
  const H = Math.round(scene.size.h * S);
  const draw = makeDrawer(scene, tl, cfg, S);

  const src = await loadImage(fs.readFileSync(`${base}.png`));
  const bg = createCanvas(W, H);
  const bctx = bg.getContext('2d');
  bctx.fillStyle = '#ffffff';
  bctx.fillRect(0, 0, W, H);
  bctx.drawImage(src, 0, 0, W, H);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const frames = Math.round(tl.loop * cfg.fps);
  console.log(`${path.basename(base)} · ${W}x${H} · loop ${tl.loop}s · ${frames} frames · ${tl.trips.length} trips`);

  if (args.preview) {
    // previews go to the temp folder, so nothing is left next to the user's notes
    const dir = path.join(os.tmpdir(), 'excalidraw-gif', path.basename(base));
    fs.mkdirSync(dir, { recursive: true });
    for (const t of args.preview) {
      draw(ctx, bg, t);
      const file = path.join(dir, `preview-${t.toFixed(2)}.png`);
      fs.writeFileSync(file, canvas.toBuffer('image/png'));
      console.log(`preview ${file}`);
    }
    return;
  }

  // palette from every 6th pixel of every 10th frame
  const parts = [];
  for (let f = 0; f < frames; f += 10) {
    draw(ctx, bg, f / cfg.fps);
    const d = ctx.getImageData(0, 0, W, H).data;
    const part = new Uint8Array(Math.floor(d.length / 24) * 4);
    for (let i = 0, j = 0; j < part.length; i += 24, j += 4) part.set(d.subarray(i, i + 4), j);
    parts.push(part);
  }
  const sample = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  parts.reduce((o, p) => { sample.set(p, o); return o + p.length; }, 0);
  const pal = buildPalette(sample, tl);
  const toIndex = nearestIndex(pal);

  // every frame after the first only stores the pixels that changed (the rest is "transparent")
  const gif = GIFEncoder();
  const delay = Math.round(1000 / cfg.fps);
  let prev = null;
  for (let f = 0; f < frames; f++) {
    draw(ctx, bg, f / cfg.fps);
    const d = ctx.getImageData(0, 0, W, H).data;
    const idx = new Uint8Array(W * H);
    for (let i = 0, p = 0; p < idx.length; i += 4, p++) idx[p] = toIndex(d[i], d[i + 1], d[i + 2]);
    if (!prev) {
      gif.writeFrame(idx, W, H, { palette: pal, delay, repeat: 0, dispose: 1 });
    } else {
      const out = new Uint8Array(idx.length);
      for (let p = 0; p < idx.length; p++) out[p] = idx[p] === prev[p] ? TRANSPARENT : idx[p];
      gif.writeFrame(out, W, H, { delay, transparent: true, transparentIndex: TRANSPARENT, dispose: 1 });
    }
    prev = idx;
  }
  gif.finish();
  const out = path.resolve(args.out || `${base}.gif`);
  fs.writeFileSync(out, gif.bytes());
  console.log(`gif ${out} · ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
}

main().catch(e => { console.error(`ERROR ${e.message}`); process.exit(1); });
