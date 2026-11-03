'use strict';
// Estimated text width. CHAR_FACTOR = upper bound of glyph width / font size for each font,
// measured on realistic labels by tests/calibrate.js, plus 5 %.
const CHAR_FACTOR = { 5: 0.71, 6: 0.64 }; // 5 = Excalifont, 6 = Nunito

function textWidth(str, size, fontFamily) {
  const longest = Math.max(...String(str).split('\n').map(l => [...l].length));
  return Math.ceil(longest * size * (CHAR_FACTOR[fontFamily] || CHAR_FACTOR[5]));
}

module.exports = { textWidth, CHAR_FACTOR };
