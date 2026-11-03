'use strict';
// Reads an .excalidraw file written by lib/build.js and answers geometry questions in diagram units: the PNG
// mapping, the box of a component, and the points of the arrow between two components.
const fs = require('fs');
const { EXPORT_PADDING } = require('../render');
const { roleOf } = require('../check');

const CURVE_STEPS = 24;      // samples per segment of a curved arrow

const norm = s => String(s).replace(/\s+/g, ' ').trim().toLowerCase();

function pointsOf(e) {
  return e.points ? e.points.map(p => [e.x + p[0], e.y + p[1]]) : [[e.x, e.y], [e.x + e.width, e.y + e.height]];
}

// Excalidraw draws a rounded arrow as a smooth curve through its points; Catmull-Rom follows the same points
function catmullRom(pts) {
  if (pts.length < 3) return pts;
  const out = [];
  const p = i => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    for (let s = 0; s < CURVE_STEPS; s++) {
      const t = s / CURVE_STEPS;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t
        + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function loadScene(file) {
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  const els = scene.elements.filter(e => !e.isDeleted);
  const byId = new Map(els.map(e => [e.id, e]));

  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  els.forEach(e => pointsOf(e).forEach(([x, y]) => {
    b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y);
  }));
  const size = { w: Math.ceil(b.x1 - b.x0 + 2 * EXPORT_PADDING), h: Math.ceil(b.y1 - b.y0 + 2 * EXPORT_PADDING) };
  const origin = { x: EXPORT_PADDING - b.x0, y: EXPORT_PADDING - b.y0 };

  // a component = a group that holds a 'component' element (kit bbox); its names = every text in that group
  const components = [];
  els.filter(e => roleOf(e) === 'component').forEach(main => {
    const g = main.groupIds[0];
    const members = els.filter(e => e.groupIds.includes(g));
    const names = members.filter(e => e.type === 'text').map(e => e.text);
    const shapes = members.filter(e => e.type !== 'text' && roleOf(e) !== 'bind');
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    shapes.forEach(e => pointsOf(e).forEach(([x, y]) => {
      box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y);
    }));
    components.push({
      group: g, names, ids: new Set(members.map(e => e.id)),
      box: { x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0 },
    });
  });

  const list = () => components.map(c => c.names.join(' / ')).join('\n  ');
  function component(name) {
    const n = norm(name);
    const exact = components.filter(c => c.names.some(t => norm(t) === n));
    const hits = exact.length ? exact : components.filter(c => c.names.some(t => norm(t).includes(n)));
    if (hits.length === 1) return hits[0];
    if (!hits.length) throw new Error(`no component named "${name}". Components:\n  ${list()}`);
    throw new Error(`"${name}" matches ${hits.length} components (${hits.map(c => c.names.join(' / ')).join(' | ')}); `
      + 'use a text that only one of them has (its label below the icon)');
  }
  const ownerOf = binding => binding && components.find(c => c.ids.has(binding.elementId));

  const arrows = els.filter(e => e.type === 'arrow').map(e => {
    const raw = pointsOf(e);
    return {
      el: e, from: ownerOf(e.startBinding), to: ownerOf(e.endBinding),
      points: e.roundness ? catmullRom(raw) : raw,
    };
  });
  // points of the arrow drawn from component `from` to component `to`
  function arrow(from, to) {
    const a = component(from);
    const z = component(to);
    const found = arrows.filter(r => r.from === a && r.to === z);
    if (found.length === 1) return found[0].points.map(p => [...p]);
    const back = arrows.filter(r => r.from === z && r.to === a);
    if (!found.length && back.length === 1) {
      throw new Error(`the arrow goes from "${to}" to "${from}"; use reverse(arrow("${to}", "${from}"))`);
    }
    throw new Error(`${found.length} arrows from "${from}" to "${to}"`);
  }

  return { size, origin, component, arrow, components, byId };
}

module.exports = { loadScene, EXPORT_PADDING };
