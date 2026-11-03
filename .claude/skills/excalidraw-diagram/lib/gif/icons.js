'use strict';
// Moving icons, drawn around (0, 0) at about 32 px wide. `color` is also the colour of the ring that pulses on the
// component an icon arrives at. Add an icon here when a flow needs a new meaning; keep one meaning per icon.
const INK = '#1e1e1e';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const ICONS = {
  // a letter / message / request: white envelope with a red seal
  letter: {
    color: '#7048e8',
    draw(ctx, color) {
      roundRect(ctx, -16, -11, 32, 22, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-14, -9);
      ctx.lineTo(0, 2);
      ctx.lineTo(14, -9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 3, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#e03131';
      ctx.fill();
    },
  },
  // an answer / reply / success: green speech bubble with a check mark
  answer: {
    color: '#2f9e44',
    draw(ctx, color) {
      roundRect(ctx, -15, -13, 30, 22, 7);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.lineTo(-9, 16);
      ctx.lineTo(1, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-7, -2);
      ctx.lineTo(-2, 3);
      ctx.lineTo(7, -6);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    },
  },
  // a list / batch / registration: blue card with three rows
  list: {
    color: '#1c7ed6',
    draw(ctx, color) {
      roundRect(ctx, -13, -10, 26, 20, 4);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-7, -5 + i * 5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-3, -5 + i * 5);
        ctx.lineTo(8, -5 + i * 5);
        ctx.stroke();
      }
    },
  },
  // a document / file: white page with a folded corner
  doc: {
    color: '#495057',
    draw(ctx, color) {
      ctx.beginPath();
      ctx.moveTo(-10, -13);
      ctx.lineTo(5, -13);
      ctx.lineTo(11, -7);
      ctx.lineTo(11, 13);
      ctx.lineTo(-10, 13);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.lineWidth = 1.5;
      [-3, 2, 7].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(-6, y);
        ctx.lineTo(7, y);
        ctx.stroke();
      });
    },
  },
  // a data write / read: small dot (pass { color } to change it)
  dot: {
    color: '#e8a200',
    fill: '#ffd43b',
    draw(ctx, color, icon) {
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = icon.fillOverride || icon.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    },
  },
  // an event / webhook / trigger: orange circle with a lightning bolt
  bolt: {
    color: '#f08c00',
    draw(ctx, color) {
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -10);
      ctx.lineTo(-6, 2);
      ctx.lineTo(0, 2);
      ctx.lineTo(-2, 10);
      ctx.lineTo(6, -2);
      ctx.lineTo(0, -2);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    },
  },
  // a failure / rejection: red circle with a cross
  fail: {
    color: '#e03131',
    draw(ctx, color) {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(5, 5);
      ctx.moveTo(5, -5);
      ctx.lineTo(-5, 5);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    },
  },
};

module.exports = { ICONS, roundRect };
