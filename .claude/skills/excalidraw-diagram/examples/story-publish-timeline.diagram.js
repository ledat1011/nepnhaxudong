// Timeline: the same publish seen over 500 ms, before and after the fix (illustrative times).
module.exports = kit => {
  const d = kit.createDiagram();
  const X0 = 200, STEP = 4;               // time 0 at X0, 4 px per millisecond
  const tx = ms => X0 + ms * STEP;
  const END = tx(500);

  d.title({
    x: 0, y: -150, text: 'The revalidate call moves behind the commit',
    subtitle: 'Before the fix the website read the old list. After the fix it reads the new story.',
  });

  function axis(y, label) {
    d.note({ x: 0, y: y - 215, w: 500, text: label, size: 26, font: 'hand' });
    d.line({ points: [[X0, y], [END + 60, y]], kind: 'main' });
    for (let ms = 0; ms <= 500; ms += 100) {
      d.line({ points: [[tx(ms), y - 12], [tx(ms), y + 12]] });
      d.note({ x: tx(ms) - 40, y: y + 18, w: 80, text: ms + ' ms', align: 'center' });
    }
  }

  // ---- lane 1: before the fix
  const y1 = 300;
  axis(y1, 'Before the fix');
  d.card({ x: tx(0) - 170, y: y1 - 140, w: 340, h: 110, color: 'event', size: 22, label: '0 ms\nadmin presses\npublish' });
  d.card({ x: tx(180) - 180, y: y1 - 170, w: 360, h: 130, color: 'service', size: 22,
    label: '180 ms\nrevalidate call,\nreads the old list' });
  d.card({ x: tx(360) - 180, y: y1 - 170, w: 360, h: 130, color: 'fail', size: 22,
    label: '360 ms\ncommit,\npage is already old' });
  d.highlight({ x: tx(360) - 210, y: y1 - 235, w: 420, h: 220, kind: 'problem', title: '⚠ page stays old' });

  // ---- lane 2: after the fix
  const y2 = 900;
  axis(y2, 'After the fix');
  d.card({ x: tx(0) - 170, y: y2 - 140, w: 340, h: 110, color: 'event', size: 22, label: '0 ms\nadmin presses\npublish' });
  d.card({ x: tx(180) - 180, y: y2 - 170, w: 360, h: 130, color: 'service', size: 22,
    label: '180 ms\ncommit\nthe story is saved' });
  d.card({ x: tx(360) - 180, y: y2 - 170, w: 360, h: 130, color: 'service', size: 22,
    label: '360 ms\nrevalidate call,\nreads the new list' });

  d.legend({ x: 0, y: y2 + 120 });
  return [{ slug: 'story-publish-timeline', diagram: d }];
};
