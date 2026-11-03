'use strict';
// Component kit for Excalidraw diagrams. Every function adds plain Excalidraw elements to one diagram.
// Components return a bbox { x, y, w, h, below, main }: link() binds arrows to `main`, and `below` is the
// height of the text under the icon, so an arrow that leaves the bottom starts under that text.
const fs = require('fs');
const { textWidth } = require('./measure');

const FONT = { hand: 5, plain: 6 }; // Excalifont, Nunito
const INK = '#1e1e1e';
const MUTED = '#343a40';
const ACCENT = { red: '#c92a2a', frameRed: '#e03131', green: '#2b8a3e', orange: '#f08c00', frame: '#868e96' };

// one colour per meaning, the same in every diagram (references/visual-language.md)
const PALETTE = {
  service: '#ffd8a8',
  queue: '#a5d8ff',
  data: '#ffec99',
  other: '#d0bfff',
  external: '#e9ecef',
  person: '#fcc2d7',
  channel: '#b2f2bb',
  fail: '#ffc9c9',
  event: '#c3fae8',
  decision: '#ffffff',
};
const LEGEND_LABELS = {
  service: 'service / consumer',
  queue: 'message queue / topic',
  data: 'database / storage',
  other: 'other internal service',
  external: 'client / external system',
  person: 'end user / recipient',
  channel: 'output channel / success',
  fail: 'failure / non-match',
  event: 'event on a timeline',
};
const HEX = /^#[0-9a-fA-F]{6}$/;
const SIZE = { title: 44, subtitle: 19, name: 24, smallName: 22, note: 18, label: 19 };
const LINE_HEIGHT = 1.25;
const GAP = 12;
const ARROW_KINDS = {
  main: { strokeColor: INK, strokeWidth: 2.5, strokeStyle: 'solid' },
  data: { strokeColor: INK, strokeWidth: 2, strokeStyle: 'dashed' },
  parallel: { strokeColor: INK, strokeWidth: 2.5, strokeStyle: 'dashed' },
  fail: { strokeColor: ACCENT.red, strokeWidth: 2.5, strokeStyle: 'solid' },
  new: { strokeColor: ACCENT.orange, strokeWidth: 4, strokeStyle: 'solid' },
};
const LABEL_COLOR = { main: MUTED, data: MUTED, parallel: MUTED, fail: ACCENT.red, new: ACCENT.orange };

const lineCount = s => String(s).split('\n').length;
const textHeight = (s, size) => lineCount(s) * size * LINE_HEIGHT;

function edgePoint(b, side) {
  switch (side) {
    case 'r': return [b.x + b.w, b.y + b.h / 2];
    case 'l': return [b.x, b.y + b.h / 2];
    case 't': return [b.x + b.w / 2, b.y - (b.above || 0)];
    case 'b': return [b.x + b.w / 2, b.y + b.h + b.below];
    default: throw new Error(`unknown side "${side}"; use r, l, t or b`);
  }
}
function offset([x, y], side, d) {
  if (side === 'r') return [x + d, y];
  if (side === 'l') return [x - d, y];
  if (side === 't') return [x, y - d];
  return [x, y + d];
}
function resolveKind(kind) {
  const style = ARROW_KINDS[kind];
  if (!style) throw new Error(`unknown arrow kind "${kind}"; known: ${Object.keys(ARROW_KINDS).join(', ')}`);
  return style;
}

function createDiagram(opts = {}) {
  const sketch = (opts.style || 'sketch') === 'sketch';
  const nameFont = sketch ? FONT.hand : FONT.plain;
  const els = [];
  const used = [];
  let seed = opts.seed || 1000;
  let auto = 0;
  let groupNo = 0;
  const nextSeed = () => ++seed;

  // ---------- primitives ----------
  function add(type, x, y, w, h, role, extra = {}) {
    const e = {
      id: `${type}-${++auto}`, type, x, y, width: w, height: h, angle: 0,
      strokeColor: INK, backgroundColor: 'transparent', fillStyle: 'solid',
      strokeWidth: 2, strokeStyle: 'solid', roughness: sketch ? 1 : 0, opacity: 100,
      groupIds: [], frameId: null, roundness: null, seed: nextSeed(), version: 1,
      versionNonce: nextSeed(), isDeleted: false, boundElements: [], updated: 1,
      link: null, locked: false, customData: { kit: role }, ...extra,
    };
    els.push(e);
    return e;
  }
  // a palette key is tracked for the colour key; a '#rrggbb' colour is used as-is and is never listed
  function fill(key) {
    if (typeof key === 'string' && HEX.test(key)) return key;
    if (!(key in PALETTE)) throw new Error(`unknown palette key "${key}"; known: ${Object.keys(PALETTE).join(', ')}`);
    if (key in LEGEND_LABELS && !used.includes(key)) used.push(key);
    return PALETTE[key];
  }
  const rect = (x, y, w, h, bg, role = 'shape', extra = {}) =>
    add('rectangle', x, y, w, h, role, { backgroundColor: bg, ...extra });
  const ellipse = (x, y, w, h, bg, role = 'shape', extra = {}) =>
    add('ellipse', x, y, w, h, role, { backgroundColor: bg, ...extra });
  function polyline(type, pts, role, extra = {}) {
    const [x0, y0] = pts[0];
    const rel = pts.map(([px, py]) => [px - x0, py - y0]);
    const xs = rel.map(p => p[0]);
    const ys = rel.map(p => p[1]);
    return add(type, x0, y0, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), role, {
      points: rel, lastCommittedPoint: null, startBinding: null, endBinding: null,
      startArrowhead: null, endArrowhead: type === 'arrow' ? 'arrow' : null, boundElements: null, ...extra,
    });
  }
  const iconLine = (pts, extra = {}) => polyline('line', pts, 'shape', extra);
  // (x, w) is the box the text is aligned in; the element itself is exactly as wide as the text
  function text(x, y, w, str, size, role, extra = {}) {
    const fontFamily = extra.fontFamily || nameFont;
    const align = extra.textAlign || 'center';
    const tw = textWidth(str, size, fontFamily);
    const tx = align === 'center' ? x + (w - tw) / 2 : align === 'right' ? x + w - tw : x;
    return add('text', tx, y, tw, textHeight(str, size), role, {
      text: String(str), originalText: String(str), fontSize: size, fontFamily,
      textAlign: align, verticalAlign: 'top', containerId: null,
      autoResize: true, lineHeight: LINE_HEIGHT, boundElements: null, ...extra,
    });
  }
  const name = (x, y, w, str, size = SIZE.name, extra = {}) => text(x, y, w, str, size, 'name', extra);
  const plain = (x, y, w, str, size, role, extra = {}) =>
    text(x, y, w, str, size, role, { fontFamily: FONT.plain, strokeColor: MUTED, ...extra });
  function group(list) {
    const g = `g-${++groupNo}`;
    list.forEach(e => e.groupIds.push(g));
    return g;
  }
  // Arrows bind to `bind`, an invisible frame over the icon plus the name above and the note below it. An editor
  // that re-snaps a bound arrow (Obsidian / excalidraw.com on open) then keeps it outside that text, as drawn here.
  function bbox(x, y, w, h, main, below = 0, above = 0) {
    main.customData = { kit: 'component' };
    const bind = rect(x, y - above, w, above + h + below, 'transparent', 'bind', {
      strokeColor: 'transparent', groupIds: [...main.groupIds],
    });
    return { x, y, w, h, below, above, main, bind };
  }
  function placeLabel(str, [cx, cy], color) {
    const tw = textWidth(str, SIZE.label, FONT.plain);
    const th = textHeight(str, SIZE.label);
    return plain(cx - tw / 2, cy - th / 2, tw, str, SIZE.label, 'label', { strokeColor: color });
  }

  // ---------- components ----------
  function serverStack({ x, y, w = 220, label, note, color = 'service' }) {
    const unit = 36;
    const gap = 6;
    const parts = [];
    let main;
    for (let i = 0; i < 3; i++) {
      const yy = y + i * (unit + gap);
      const r = rect(x, yy, w, unit, fill(color), 'shape', { roundness: { type: 3 } });
      if (i === 1) main = r;
      parts.push(r, ellipse(x + 14, yy + 11, 14, 14, INK), iconLine([[x + w * 0.45, yy + 18], [x + w - 16, yy + 18]]));
    }
    const h = 3 * unit + 2 * gap;
    parts.push(name(x - 100, y - 10 - textHeight(label, SIZE.name), w + 200, label));
    let below = 0;
    if (note) {
      parts.push(plain(x - 100, y + h + 10, w + 200, note, SIZE.note, 'note'));
      below = 10 + textHeight(note, SIZE.note);
    }
    group(parts);
    return bbox(x, y, w, h, main, below, 10 + textHeight(label, SIZE.name));
  }

  function queue({ x, y, w = 220, h = 90, label, labelBelow = false }) {
    const cap = h * 0.45;
    const bg = fill('queue');
    const body = rect(x + cap / 2, y, w - cap, h, bg, 'shape', { strokeColor: 'transparent' });
    const parts = [body, ellipse(x, y, cap, h, bg),
      iconLine([[x + cap / 2, y], [x + w - cap / 2, y]]), iconLine([[x + cap / 2, y + h], [x + w - cap / 2, y + h]]),
      ellipse(x + w - cap, y, cap, h, bg)];
    const ew = 38;
    const eh = 26;
    const n = 3;
    const space = (w - cap * 1.5 - n * ew) / (n + 1);
    for (let i = 0; i < n; i++) {
      const ex = x + cap + space * (i + 1) + ew * i - 6;
      const ey = y + (h - eh) / 2;
      parts.push(rect(ex, ey, ew, eh, '#ffffff', 'shape', { strokeWidth: 1.5 }),
        iconLine([[ex, ey], [ex + ew / 2, ey + eh * 0.55], [ex + ew, ey]], { strokeWidth: 1.5 }));
    }
    const labelH = textHeight(label, SIZE.smallName);
    parts.push(name(x - 60, labelBelow ? y + h + 10 : y - 10 - labelH, w + 120, label, SIZE.smallName));
    group(parts);
    return bbox(x, y, w, h, body, labelBelow ? 10 + labelH : 0, labelBelow ? 0 : 10 + labelH);
  }

  function database({ x, y, w = 150, h = 170, label, note, badge }) {
    if (badge && badge !== 'doc' && badge !== 'file') throw new Error(`unknown database badge "${badge}"; use "doc" or "file"`);
    const cap = w * 0.32;
    const bg = fill('data');
    const parts = [ellipse(x, y + h - cap, w, cap, bg)];
    const body = rect(x, y + cap / 2, w, h - cap, bg, 'shape', { strokeColor: 'transparent' });
    parts.push(body, iconLine([[x, y + cap / 2], [x, y + h - cap / 2]]), iconLine([[x + w, y + cap / 2], [x + w, y + h - cap / 2]]));
    for (const f of [0.38, 0.62]) {
      const yy = y + cap / 2 + (h - cap) * f;
      parts.push(iconLine([[x, yy], [x + w / 2, yy + cap / 2], [x + w, yy]], { roundness: { type: 2 } }));
    }
    parts.push(ellipse(x, y, w, cap, bg));
    if (badge === 'doc') {
      parts.push(rect(x + w - 30, y + h - 56, 44, 56, '#ffffff', 'shape', { roundness: { type: 3 } }));
      for (let i = 0; i < 3; i++) {
        parts.push(iconLine([[x + w - 22, y + h - 42 + i * 13], [x + w + 6, y + h - 42 + i * 13]], { strokeWidth: 1.5 }));
      }
    }
    if (badge === 'file') {
      parts.push(rect(x + w - 30, y + h - 56, 44, 56, '#ffffff'));
      parts.push(iconLine([[x + w - 30, y + h - 42], [x + w - 16, y + h - 56]], { strokeWidth: 1.5 }));
    }
    const nameH = textHeight(label, SIZE.smallName);
    parts.push(name(x - 100, y + h + 14, w + 200, label, SIZE.smallName));
    let below = 14 + nameH;
    if (note) {
      parts.push(plain(x - 110, y + h + 20 + nameH, w + 220, note, SIZE.note, 'note'));
      below = 20 + nameH + textHeight(note, SIZE.note);
    }
    group(parts);
    return bbox(x, y, w, h, body, below);
  }

  function browserWindow({ x, y, w = 180, h = 130, label, caption = 'API', color = 'external' }) {
    const win = rect(x, y, w, h, fill(color));
    const parts = [win, iconLine([[x, y + 28], [x + w, y + 28]])];
    for (let i = 0; i < 3; i++) parts.push(ellipse(x + 10 + i * 17, y + 9, 11, 11, INK));
    // the caption is decoration inside the icon: role glyph, so the window is described by its label
    parts.push(text(x, y + 28 + (h - 28 - 37.5) / 2, w, caption, 30, 'glyph'));
    parts.push(name(x - 60, y + h + 14, w + 120, label, SIZE.smallName));
    group(parts);
    return bbox(x, y, w, h, win, 14 + textHeight(label, SIZE.smallName));
  }

  function card({ x, y, w = 240, h = 80, label, color = 'other', size = SIZE.smallName, note }) {
    const r = rect(x, y, w, h, fill(color), 'shape', { roundness: { type: 3 } });
    const parts = [r, name(x, y + (h - textHeight(label, size)) / 2, w, label, size)];
    let below = 0;
    if (note) {
      parts.push(plain(x - 40, y + h + 10, w + 80, note, SIZE.note, 'note'));
      below = 10 + textHeight(note, SIZE.note);
    }
    group(parts);
    return bbox(x, y, w, h, r, below);
  }

  function diamond({ x, y, w = 230, h = 180, label }) {
    const dm = add('diamond', x, y, w, h, 'shape', { backgroundColor: fill('decision'), strokeWidth: 2.5 });
    group([dm, name(x, y + (h - textHeight(label, SIZE.name)) / 2, w, label)]);
    return bbox(x, y, w, h, dm);
  }

  function person({ x, y, label = 'user', note }) {
    const bg = fill('person');
    const head = ellipse(x + 24, y, 40, 40, bg);
    const body = rect(x, y + 46, 88, 70, bg, 'shape', { roundness: { type: 3 }, fillStyle: 'cross-hatch' });
    const nameH = textHeight(label, SIZE.smallName);
    const parts = [head, body, name(x - 116, y + 124, 320, label, SIZE.smallName)];
    let below = 8 + nameH;
    if (note) {
      parts.push(plain(x - 156, y + 130 + nameH, 400, note, SIZE.note, 'note'));
      below = 14 + nameH + textHeight(note, SIZE.note);
    }
    group(parts);
    return bbox(x, y, 88, 116, body, below);
  }

  const GLYPHS = {
    inbox: (gx, gy) => [rect(gx, gy, 40, 30, '#ffffff', 'shape', { strokeWidth: 1.5 }),
      iconLine([[gx, gy + 16], [gx + 12, gy + 16], [gx + 15, gy + 22], [gx + 25, gy + 22], [gx + 28, gy + 16], [gx + 40, gy + 16]], { strokeWidth: 1.5 })],
    phone: (gx, gy) => [rect(gx + 8, gy - 4, 24, 40, '#ffffff', 'shape', { roundness: { type: 3 }, strokeWidth: 1.5 }),
      ellipse(gx + 17, gy + 27, 6, 5, INK, 'shape', { strokeWidth: 1 })],
    doc: (gx, gy) => {
      const p = [rect(gx + 6, gy - 4, 28, 38, '#ffffff', 'shape', { strokeWidth: 1.5 })];
      for (let i = 0; i < 3; i++) p.push(iconLine([[gx + 11, gy + 6 + i * 9], [gx + 29, gy + 6 + i * 9]], { strokeWidth: 1 }));
      return p;
    },
    envelope: (gx, gy) => [rect(gx, gy, 40, 28, '#ffffff', 'shape', { strokeWidth: 1.5 }),
      iconLine([[gx, gy], [gx + 20, gy + 15], [gx + 40, gy]], { strokeWidth: 1.5 })],
    at: (gx, gy) => [ellipse(gx + 2, gy - 4, 36, 36, '#ffffff', 'shape', { strokeWidth: 1.5 }),
      text(gx + 2, gy - 1, 36, '@', 24, 'glyph')],
  };

  function channel({ x, y, w = 230, h = 80, label, glyph }) {
    if (!GLYPHS[glyph]) throw new Error(`unknown glyph "${glyph}"; known: ${Object.keys(GLYPHS).join(', ')}`);
    const r = rect(x, y, w, h, fill('channel'), 'shape', { roundness: { type: 3 } });
    const parts = [r, name(x + 66, y + (h - SIZE.name * LINE_HEIGHT) / 2, w - 74, label, SIZE.name, { textAlign: 'left' }),
      ...GLYPHS[glyph](x + 14, y + (h - 30) / 2)];
    group(parts);
    return bbox(x, y, w, h, r);
  }

  // ---------- layout helpers ----------
  function frame({ x, y, w, h, label }) {
    const r = rect(x, y, w, h, 'transparent', 'frame', { strokeStyle: 'dashed', strokeColor: ACCENT.frame, roundness: { type: 3 } });
    group([r, name(x + 18, y + 12, w - 36, label, 26, { textAlign: 'left', strokeColor: ACCENT.frame })]);
    return { x, y, w, h, below: 0, above: 0, main: r };
  }

  function highlight({ x, y, w, h, kind = 'new', title: heading }) {
    if (kind !== 'new' && kind !== 'problem') throw new Error(`unknown highlight kind "${kind}"; use "new" or "problem"`);
    const color = kind === 'new' ? ACCENT.orange : ACCENT.frameRed;
    const r = rect(x, y, w, h, 'transparent', 'highlight', { strokeColor: color, strokeWidth: 4, roundness: { type: 3 } });
    group([r, name(x + 18, y + 12, w - 36, heading, SIZE.name, { textAlign: 'left', strokeColor: color })]);
    return { x, y, w, h, below: 0, above: 0, main: r };
  }

  function title({ x = 0, y = 0, text: heading, subtitle }) {
    const parts = [text(x, y, 0, heading, SIZE.title, 'title', { textAlign: 'left' })];
    if (subtitle) {
      parts.push(text(x, y + 64, 0, subtitle, SIZE.subtitle, 'title', { textAlign: 'left', fontFamily: FONT.plain, strokeColor: MUTED }));
    }
    group(parts);
  }

  function legend({ x, y, title: heading = 'Colour key', extra = [] }) {
    const rows = [
      ...Object.keys(LEGEND_LABELS).filter(k => used.includes(k)).map(k => ({ color: PALETTE[k], label: LEGEND_LABELS[k] })),
      ...extra.map(r => ({ color: fill(r.color), label: r.label })),
    ];
    text(x, y, 0, heading, SIZE.name, 'legend', { textAlign: 'left' });
    rows.forEach((r, i) => {
      const yy = y + 44 + i * 40;
      group([rect(x, yy, 40, 28, r.color, 'legend', { roundness: { type: 3 } }),
        text(x + 54, yy + 2, 0, r.label, SIZE.label, 'legend', { textAlign: 'left', fontFamily: FONT.plain, strokeColor: INK })]);
    });
    return { x, y, w: 420, h: 44 + rows.length * 40, below: 0, above: 0 };
  }

  function freeNote({ x, y, w = 400, text: str, size = SIZE.note, align = 'left', color = MUTED, font = 'plain' }) {
    return text(x, y, w, str, size, 'note', { textAlign: align, strokeColor: color, fontFamily: FONT[font] });
  }

  function line({ points, kind = 'main' }) {
    return polyline('line', points, 'line', { ...resolveKind(kind), roundness: { type: 2 } });
  }

  // ---------- arrows ----------
  function link(from, fromSide, to, toSide, opts = {}) {
    const kind = opts.kind || 'main';
    const style = resolveKind(kind);
    const p0 = offset(edgePoint(from, fromSide), fromSide, GAP);
    const p2 = offset(edgePoint(to, toSide), toSide, GAP);
    const dx = p2[0] - p0[0];
    const dy = p2[1] - p0[1];
    const len = Math.hypot(dx, dy) || 1;
    const normal = [-dy / len, dx / len];
    const bend = opts.bend ?? 25;
    const p1 = [(p0[0] + p2[0]) / 2 + normal[0] * bend, (p0[1] + p2[1]) / 2 + normal[1] * bend];
    const pts = opts.via ? [p0, ...opts.via, p2] : [p0, p1, p2];
    const a = polyline('arrow', pts, 'arrow', {
      ...style, roundness: { type: 2 }, elbowed: false,
      startBinding: { elementId: (from.bind || from.main).id, focus: 0, gap: GAP },
      endBinding: { elementId: (to.bind || to.main).id, focus: 0, gap: GAP },
    });
    (from.bind || from.main).boundElements.push({ type: 'arrow', id: a.id });
    (to.bind || to.main).boundElements.push({ type: 'arrow', id: a.id });
    const label = opts.label ?? (kind === 'parallel' ? 'in parallel' : null);
    if (label) {
      let center = opts.labelAt;
      if (!center) {
        // beside the bulge of the curve, far enough that the text box does not touch the line
        const side = Math.sign(bend) || 1;
        const tw = textWidth(label, SIZE.label, FONT.plain);
        const th = textHeight(label, SIZE.label);
        const dist = 10 + Math.abs(normal[0]) * tw / 2 + Math.abs(normal[1]) * th / 2;
        center = [p1[0] + normal[0] * side * dist, p1[1] + normal[1] * side * dist];
      }
      placeLabel(label, center, opts.labelColor || LABEL_COLOR[kind]);
    }
    return a;
  }

  function lifeline({ x, y, w = 220, h = 70, label, color = 'service', length = 600 }) {
    const head = card({ x, y, w, h, label, color });
    const cx = x + w / 2;
    const l = polyline('line', [[cx, y + h], [cx, y + h + length]], 'lifeline',
      { strokeStyle: 'dashed', strokeColor: ACCENT.frame, strokeWidth: 2 });
    l.groupIds.push(...head.main.groupIds);
    return { ...head, cx, bottom: y + h + length };
  }

  // a sequence message is not bound: binding it to the lifeline head would snap it to the head when edited
  function message(from, to, y, opts = {}) {
    const kind = opts.kind || (opts.reply ? 'data' : 'main');
    const style = resolveKind(kind);
    const self = from === to;
    const dir = to.cx >= from.cx ? 1 : -1;
    const pts = self
      ? [[from.cx + 6, y], [from.cx + 70, y + 4], [from.cx + 70, y + 36], [from.cx + 8, y + 40]]
      : [[from.cx + dir * 6, y], [to.cx - dir * 6, y]];
    const a = polyline('arrow', pts, 'message', { ...style, roundness: self ? { type: 2 } : null, elbowed: false });
    if (opts.label) {
      const color = LABEL_COLOR[kind];
      if (self) {
        plain(from.cx + 82, y + 20 - textHeight(opts.label, SIZE.label) / 2, 0, opts.label, SIZE.label, 'label', { textAlign: 'left', strokeColor: color });
      } else {
        placeLabel(opts.label, [(from.cx + to.cx) / 2, y - 8 - textHeight(opts.label, SIZE.label) / 2], color);
      }
    }
    return a;
  }

  function scene() {
    return {
      type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements: els,
      appState: { viewBackgroundColor: '#ffffff', gridSize: null, currentItemFontFamily: nameFont },
      files: {},
    };
  }
  function save(file) {
    fs.writeFileSync(file, JSON.stringify(scene(), null, 2));
    return file;
  }

  return {
    serverStack, queue, database, browserWindow, card, diamond, person, channel,
    frame, highlight, title, legend, note: freeNote, line, link, lifeline, message,
    scene, save, elements: () => els,
  };
}

module.exports = { createDiagram, PALETTE, LEGEND_LABELS, SIZE, FONT, ARROW_KINDS, GAP };
