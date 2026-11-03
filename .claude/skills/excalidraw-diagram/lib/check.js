'use strict';
// Layout lint for a .excalidraw scene: overlaps, arrows through text, and text that will be too small
// once the PNG is shown in a PR or a wiki page. Roles come from customData.kit set by kit.js.
const fs = require('fs');

const LIMITS = {
  displayWidth: 1600, minScreenPx: 11, exportPadding: 30, components: 20, aspect: 2,
  lineChars: 40, noteLines: 3, tolerance: 2, arrowMargin: 3,
};
const SHAPES = new Set(['rectangle', 'ellipse', 'diamond']);
const roleOf = e => (e.customData && e.customData.kit) || '';

const boxOf = e => ({ x0: e.x, y0: e.y, x1: e.x + e.width, y1: e.y + e.height });
const overlaps = (a, b, tol = LIMITS.tolerance) =>
  a.x0 < b.x1 - tol && b.x0 < a.x1 - tol && a.y0 < b.y1 - tol && b.y0 < a.y1 - tol;
const contains = (outer, inner) =>
  inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1;
const sharesGroup = (a, b) => a.groupIds.some(g => b.groupIds.includes(g));
const absPoints = e => e.points.map(([px, py]) => [e.x + px, e.y + py]);

// Liang-Barsky line segment clipping: returns true if segment [x1,y1]→[x2,y2] intersects box
function segmentHitsBox([x1, y1], [x2, y2], box) {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges = [
    [-dx, x1 - box.x0],     // left edge
    [dx, box.x1 - x1],      // right edge
    [-dy, y1 - box.y0],     // top edge
    [dy, box.y1 - y1],      // bottom edge
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        t0 = Math.max(t0, t);
      } else {
        t1 = Math.min(t1, t);
      }
      if (t0 > t1) return false;
    }
  }
  return true;
}

// Catmull-Rom through every point, the way Excalidraw draws a curved arrow
function sampleCurve(pts, steps = 16) {
  if (pts.length < 2) return pts.map(p => p.slice());
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  for (let i = 1; i < p.length - 2; i++) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * (2 * p[i][k] + (-p[i - 1][k] + p[i + 1][k]) * t
        + (2 * p[i - 1][k] - 5 * p[i][k] + 4 * p[i + 1][k] - p[i + 2][k]) * t2
        + (-p[i - 1][k] + 3 * p[i][k] - 3 * p[i + 1][k] + p[i + 2][k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

function bounds(els) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const e of els) {
    const pts = e.points ? absPoints(e) : [[e.x, e.y], [e.x + e.width, e.y + e.height]];
    for (const [px, py] of pts) {
      x0 = Math.min(x0, px);
      y0 = Math.min(y0, py);
      x1 = Math.max(x1, px);
      y1 = Math.max(y1, py);
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

function describer(els) {
  const byId = new Map(els.map(e => [e.id, e]));
  const quote = (t, line = t.text.split('\n')[0]) => `"${line.slice(0, 40)}"`;
  const nameOf = e => {
    const label = els.find(t => t.type === 'text' && roleOf(t) === 'name' && sharesGroup(t, e));
    return label ? quote(label) : `${e.type} ${e.id}`;
  };
  return (e, line) => {
    if (e.type === 'text') return quote(e, line);
    if (e.type === 'arrow' || e.type === 'line') {
      const s = e.startBinding && byId.get(e.startBinding.elementId);
      const t = e.endBinding && byId.get(e.endBinding.elementId);
      if (s && t) return `${e.type} ${nameOf(s)} → ${nameOf(t)}`;
      return e.groupIds.length ? `${e.type} of ${nameOf(e)}` : `${e.type} ${e.id}`;
    }
    return nameOf(e);
  };
}

function check(scene) {
  const els = scene.elements.filter(e => !e.isDeleted);
  const describe = describer(els);
  const texts = els.filter(e => e.type === 'text');
  // the invisible binding frame (role 'bind') is not drawn, so text may sit on it
  const shapes = els.filter(e => SHAPES.has(e.type) && roleOf(e) !== 'bind');
  const paths = els.filter(e => e.type === 'arrow' || (e.type === 'line' && roleOf(e) !== 'shape'));
  const errors = [];
  const warnings = [];

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      if (overlaps(boxOf(texts[i]), boxOf(texts[j]))) errors.push(`text overlap: ${describe(texts[i])} ↔ ${describe(texts[j])}`);
    }
  }
  for (const t of texts) {
    const tb = boxOf(t);
    for (const s of shapes) {
      if (sharesGroup(t, s)) continue;
      const sb = boxOf(s);
      if (overlaps(tb, sb) && !contains(sb, tb)) errors.push(`text crosses shape: ${describe(t)} ↔ ${describe(s)}`);
    }
  }
  // a name whose anchor point (left edge, right edge or centre, by its alignment) lies inside its own component is a
  // label meant to sit inside it (card, channel, diamond, lifeline head); names drawn above or below an icon have
  // their anchor outside the main element
  const compEls = els.filter(e => roleOf(e) === 'component');
  const anchorOf = t => {
    const cy = t.y + t.height / 2;
    if (t.textAlign === 'left') return [t.x + 1, cy];
    if (t.textAlign === 'right') return [t.x + t.width - 1, cy];
    return [t.x + t.width / 2, cy];
  };
  for (const t of texts.filter(e => roleOf(e) === 'name')) {
    const comp = compEls.find(c => sharesGroup(t, c));
    if (!comp) continue;
    const cb = boxOf(comp);
    const [ax, ay] = anchorOf(t);
    if (ax < cb.x0 || ax > cb.x1 || ay < cb.y0 || ay > cb.y1) continue;
    if (!contains(cb, boxOf(t))) {
      const longest = t.text.split('\n').reduce((a, l) => ([...l].length > [...a].length ? l : a), '');
      errors.push(`text overflows its box: ${describe(t, longest)} in ${describe(comp)} → shorten it, break the line or widen the box`);
    }
  }
  const m = LIMITS.arrowMargin;
  for (const p of paths) {
    const samples = sampleCurve(absPoints(p));
    for (const t of texts) {
      const b = { x0: boxOf(t).x0 + m, y0: boxOf(t).y0 + m, x1: boxOf(t).x1 - m, y1: boxOf(t).y1 - m };
      for (let i = 0; i < samples.length - 1; i++) {
        if (segmentHitsBox(samples[i], samples[i + 1], b)) {
          errors.push(`${p.type} crosses text: ${describe(p)} through ${describe(t)}`);
          break;
        }
      }
    }
  }

  const box = bounds(els);
  const canvasWidth = box.w + 2 * LIMITS.exportPadding;
  const canvasHeight = box.h + 2 * LIMITS.exportPadding;
  const scale = Math.min(1, LIMITS.displayWidth / canvasWidth);
  const smallest = texts.reduce((a, t) => (!a || t.fontSize < a.fontSize ? t : a), null);
  const minScreenPx = smallest ? smallest.fontSize * scale : Infinity;
  if (smallest && minScreenPx < LIMITS.minScreenPx) {
    errors.push(`text too small: ${describe(smallest)} is ${minScreenPx.toFixed(1)} px at a ${LIMITS.displayWidth} px display `
      + `(canvas ${Math.round(canvasWidth)} px wide) → split the diagram or make it narrower`);
  }

  for (const a of els.filter(e => e.type === 'arrow' && roleOf(e) === 'arrow')) {
    if (!a.startBinding || !a.endBinding) warnings.push(`arrow not bound to a component: ${describe(a)}`);
  }
  const components = els.filter(e => roleOf(e) === 'component').length;
  if (components > LIMITS.components) {
    warnings.push(`${components} components (> ${LIMITS.components}) → split into an overview and a detail diagram`);
  }
  const aspect = Math.max(canvasWidth / canvasHeight, canvasHeight / canvasWidth);
  if (aspect > LIMITS.aspect) warnings.push(`aspect ratio ${aspect.toFixed(2)} (> ${LIMITS.aspect}) → the PNG gets small in a PR; rearrange or split`);
  const highlights = els.filter(e => roleOf(e) === 'highlight').length;
  if (highlights > 1) warnings.push(`${highlights} highlight regions (> 1) → one highlight per diagram`);
  for (const t of texts.filter(e => ['name', 'note', 'label'].includes(roleOf(e)))) {
    const lines = t.text.split('\n');
    const longLine = lines.find(l => [...l].length > LIMITS.lineChars);
    if (longLine) warnings.push(`line longer than ${LIMITS.lineChars} characters: ${describe(t, longLine)}`);
    if (roleOf(t) !== 'name' && lines.length > LIMITS.noteLines) warnings.push(`note longer than ${LIMITS.noteLines} lines: ${describe(t)}`);
  }

  return {
    errors, warnings,
    stats: { canvasWidth: Math.round(canvasWidth), canvasHeight: Math.round(canvasHeight), minScreenPx, components },
  };
}

function format(r) {
  const s = r.stats;
  const px = Number.isFinite(s.minScreenPx) ? s.minScreenPx.toFixed(1) : '-';
  return [
    ...r.errors.map(e => `ERROR ${e}`),
    ...r.warnings.map(w => `WARN  ${w}`),
    `canvas ${s.canvasWidth}×${s.canvasHeight} px · smallest text ${px} px at ${LIMITS.displayWidth} px · `
      + `${s.components} components · ${r.errors.length} errors, ${r.warnings.length} warnings`,
  ].join('\n');
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node check.js <file.excalidraw>');
    process.exit(2);
  }
  const result = check(JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log(format(result));
  process.exit(result.errors.length ? 1 : 0);
}

module.exports = { check, format, sampleCurve, bounds, LIMITS, roleOf };
