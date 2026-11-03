// One picture of every kit component, for references/components.md.
module.exports = kit => {
  const d = kit.createDiagram();
  d.title({ x: 0, y: -170, text: 'excalidraw-diagram components', subtitle: 'kit.js functions; the colour comes from the meaning (references/visual-language.md).' });
  const caption = (b, text) => d.note({ x: b.x - 80, y: b.y + b.h + b.below + 16, w: b.w + 160, text, align: 'center', color: '#1e1e1e' });

  caption(d.serverStack({ x: 0, y: 40, label: 'service' }), 'serverStack()');
  caption(d.queue({ x: 380, y: 55, label: 'topic' }), 'queue()');
  caption(d.database({ x: 740, y: 20, label: 'database', badge: 'doc' }), "database({ badge: 'doc' })");
  caption(d.browserWindow({ x: 1080, y: 20, label: 'client' }), 'browserWindow()');
  caption(d.card({ x: 0, y: 420, label: 'other service' }), 'card()');
  caption(d.diamond({ x: 360, y: 370, label: 'decision?' }), 'diamond()');
  caption(d.person({ x: 760, y: 380, label: 'user' }), 'person()');
  caption(d.channel({ x: 1060, y: 420, label: 'EMAIL', glyph: 'at' }), "channel({ glyph: 'at' })");

  d.highlight({ x: -30, y: 720, w: 720, h: 230, kind: 'new', title: '★ new in this change' });
  const a = d.card({ x: 20, y: 800, w: 220, color: 'service', label: 'old step' });
  const b = d.card({ x: 420, y: 800, w: 220, color: 'service', label: 'new step' });
  d.link(a, 'r', b, 'l', { kind: 'new', label: 'new flow' });

  d.legend({ x: 900, y: 720 });
  return [{ slug: 'components-sheet', diagram: d }];
};
