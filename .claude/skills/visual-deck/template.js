// visual-deck scaffold — runnable as-is, then customize.
// Run: cd <dir> && export NODE_PATH="$(npm root -g)" && node template.js
//      python "<pptx-skill>/scripts/rezip.py" Deck.pptx
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaUsers, FaBolt, FaGaugeHigh, FaRocket, FaCompass, FaCircleCheck, FaXmark, FaArrowRightLong } = require("react-icons/fa6");

// ---- PALETTE (customize / sample from brand) ----
const ACCENT = "F8C800"; // brand accent (circles, rules)
const INK = "1A1A1A";    // dark bg + headlines
const PANEL = "26262B";  // card on dark
const PAPER = "FFFFFF";
const BODY = "3A3A3A", GRAY = "8A8A8A", HAIR = "E4E4E4", TINT = "FAFAFA";
const F = "Arial";
const L = 0.7, R = 12.63, CW = R - L;       // LAYOUT_WIDE = 13.33 x 7.5
let TOTAL = 0;                               // set after you know slide count

async function ic(Comp, hex, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: hex, size: String(size) }));
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}
const makeShadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 90, opacity: 0.10 });

(async () => {
  const I = {
    users: await ic(FaUsers, "#" + INK), bolt: await ic(FaBolt, "#" + INK), gauge: await ic(FaGaugeHigh, "#" + INK),
    rocket: await ic(FaRocket, "#" + INK), check: await ic(FaCircleCheck, "#" + INK), x: await ic(FaXmark, "#" + GRAY),
    arrow: await ic(FaArrowRightLong, "#" + ACCENT), compass: await ic(FaCompass, "#" + ACCENT),
  };
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; pres.author = "Author"; pres.title = "Deck";

  // ---- chrome for light content slides ----
  function chrome(s, idx, kicker) {
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: ACCENT } });
    s.addShape(pres.shapes.RECTANGLE, { x: L, y: 0.62, w: 0.30, h: 0.05, fill: { color: ACCENT } });
    s.addText(kicker, { x: L + 0.42, y: 0.48, w: 8, h: 0.34, fontFace: F, fontSize: 11, bold: true, color: GRAY, charSpacing: 1.5, valign: "middle", margin: 0 });
    s.addText(`${String(idx).padStart(2, "0")} / ${TOTAL}`, { x: R - 2, y: 0.48, w: 2, h: 0.34, fontFace: F, fontSize: 11, bold: true, color: GRAY, charSpacing: 1.5, align: "right", valign: "middle", margin: 0 });
  }
  const title = (s, t, size = 38) => s.addText(t, { x: L - 0.02, y: 1.0, w: CW, h: 1.0, fontFace: F, fontSize: size, bold: true, color: INK, valign: "top", margin: 0, lineSpacingMultiple: 1.0 });
  function iconCircle(s, x, y, d, icon) {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: ACCENT } });
    s.addImage({ data: icon, x: x + d * 0.27, y: y + d * 0.27, w: d * 0.46, h: d * 0.46 });
  }

  const slides = [];        // collect builder fns so TOTAL is known before chrome runs
  const add = (fn) => slides.push(fn);

  // 1) TITLE (dark)
  add(() => { const s = pres.addSlide(); s.background = { color: INK };
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: ACCENT } });
    s.addShape(pres.shapes.RECTANGLE, { x: L, y: 1.5, w: 1.0, h: 1.0, fill: { color: ACCENT } });
    s.addText("KICKER · CONTEXT", { x: L, y: 0.9, w: 11.5, h: 0.35, fontFace: F, fontSize: 12, bold: true, color: ACCENT, charSpacing: 1.5, margin: 0 });
    s.addText("Deck Title\nSecond line", { x: L - 0.03, y: 2.9, w: 11.6, h: 2.4, fontFace: F, fontSize: 60, bold: true, color: PAPER, valign: "top", lineSpacingMultiple: 0.98, margin: 0 });
    s.addText("One-line subtitle.", { x: L, y: 5.7, w: 11, h: 0.5, fontFace: F, fontSize: 20, color: "C9C9CE", margin: 0 });
    s.addNotes("Full spoken opening goes here."); });

  // 2) AGENDA
  add(() => { const s = pres.addSlide(); s.background = { color: PAPER }; chrome(s, 2, "AGENDA"); title(s, "What we'll cover.");
    const items = ["Item one", "Item two", "Item three", "Item four", "Item five", "Item six"];
    const col = [L, 6.95], W = 5.3;
    items.forEach((a, i) => { const c = Math.floor(i / 3), row = i % 3, x = col[c], y = 2.55 + row * 1.25;
      s.addShape(pres.shapes.OVAL, { x, y, w: 0.66, h: 0.66, fill: { color: ACCENT } });
      s.addText(String(i + 1), { x, y, w: 0.66, h: 0.66, fontFace: F, fontSize: 24, bold: true, color: INK, align: "center", valign: "middle", margin: 0 });
      s.addText(a, { x: x + 1.0, y: y - 0.08, w: W - 1.0, h: 0.82, fontFace: F, fontSize: 21, bold: true, color: INK, valign: "middle", margin: 0 }); });
    s.addNotes("Spoken agenda walk-through."); });

  // 3) THREE FACT/STAT CARDS
  add(() => { const s = pres.addSlide(); s.background = { color: PAPER }; chrome(s, 3, "SECTION"); title(s, "Three cards.");
    const cards = [{ ic: I.users, big: "Big A", sub: "label" }, { ic: I.bolt, big: "Big B", sub: "label" }, { ic: I.gauge, big: "Big C", sub: "label" }];
    let x = L; const w = (CW - 2 * 0.4) / 3;
    cards.forEach((c) => { s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.5, w, h: 2.55, fill: { color: TINT }, line: { color: HAIR, width: 1 }, rectRadius: 0.06, shadow: makeShadow() });
      iconCircle(s, x + 0.4, 2.9, 0.85, c.ic);
      s.addText(c.big, { x: x + 0.4, y: 3.95, w: w - 0.8, h: 0.55, fontFace: F, fontSize: 23, bold: true, color: INK, margin: 0 });
      s.addText(c.sub, { x: x + 0.4, y: 4.5, w: w - 0.8, h: 0.45, fontFace: F, fontSize: 14, color: GRAY, margin: 0 }); x += w + 0.4; });
    s.addNotes("Spoken."); });

  // 4) COMPARISON (before card / accent card)
  add(() => { const s = pres.addSlide(); s.background = { color: PAPER }; chrome(s, 4, "SECTION"); title(s, "Before vs Now.", 36);
    const cw = 5.35, lx = L, rx = R - cw;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: lx, y: 2.45, w: cw, h: 3.9, fill: { color: TINT }, line: { color: HAIR, width: 1 }, rectRadius: 0.06 });
    s.addText("BEFORE", { x: lx + 0.4, y: 2.75, w: cw - 0.8, h: 0.35, fontFace: F, fontSize: 12, bold: true, color: GRAY, charSpacing: 1.5, margin: 0 });
    ["Point one", "Point two", "Point three", "Point four"].forEach((t, i) => { s.addImage({ data: I.x, x: lx + 0.42, y: 3.32 + i * 0.66, w: 0.3, h: 0.3 });
      s.addText(t, { x: lx + 0.88, y: 3.26 + i * 0.66, w: cw - 1.3, h: 0.45, fontFace: F, fontSize: 16, color: BODY, valign: "middle", margin: 0 }); });
    s.addImage({ data: I.arrow, x: 6.18, y: 4.1, w: 0.95, h: 0.6 });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: rx, y: 2.45, w: cw, h: 3.9, fill: { color: ACCENT }, rectRadius: 0.06, shadow: makeShadow() });
    s.addText("NOW", { x: rx + 0.4, y: 2.75, w: cw - 0.8, h: 0.35, fontFace: F, fontSize: 12, bold: true, color: INK, charSpacing: 1.5, margin: 0 });
    ["Point one", "Point two", "Point three", "Point four"].forEach((t, i) => { s.addImage({ data: I.check, x: rx + 0.42, y: 3.32 + i * 0.66, w: 0.3, h: 0.3 });
      s.addText(t, { x: rx + 0.88, y: 3.26 + i * 0.66, w: cw - 1.3, h: 0.45, fontFace: F, fontSize: 16, bold: true, color: INK, valign: "middle", margin: 0 }); });
    s.addNotes("Spoken."); });

  // 5) BIG-NUMBER / FILL-IN PLACEHOLDER callouts
  add(() => { const s = pres.addSlide(); s.background = { color: PAPER }; chrome(s, 5, "RESULTS"); title(s, "The numbers.");
    const ms = [{ ic: I.bolt, k: "METRIC A", m: "what to measure" }, { ic: I.check, k: "METRIC B", m: "what to measure" }, { ic: I.gauge, k: "METRIC C", m: "what to measure" }];
    let x = L; const w = (CW - 2 * 0.4) / 3;
    ms.forEach((m) => { s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.7, w, h: 3.3, fill: { color: TINT }, line: { color: HAIR, width: 1 }, rectRadius: 0.06, shadow: makeShadow() });
      iconCircle(s, x + 0.4, 3.0, 0.8, m.ic);
      s.addText(m.k, { x: x + 1.35, y: 3.05, w: w - 1.6, h: 0.7, fontFace: F, fontSize: 16, bold: true, color: GRAY, charSpacing: 1.5, valign: "middle", margin: 0 });
      // Replace this dashed box with a real big number when you have data:
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.4, y: 3.8, w: w - 0.8, h: 1.05, fill: { color: PAPER }, line: { color: ACCENT, width: 2, dashType: "dash" }, rectRadius: 0.05 });
      s.addText("your figure", { x: x + 0.4, y: 3.8, w: w - 0.8, h: 1.05, fontFace: F, fontSize: 16, italic: true, color: GRAY, align: "center", valign: "middle", margin: 0 });
      s.addText(m.m, { x: x + 0.4, y: 5.0, w: w - 0.8, h: 0.7, fontFace: F, fontSize: 14, color: BODY, align: "center", valign: "top", margin: 0 }); x += w + 0.4; });
    s.addNotes("Spoken. Never invent numbers — keep the placeholder until you have real data."); });

  // 6) CLOSING (dark)
  add(() => { const s = pres.addSlide(); s.background = { color: INK };
    s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: ACCENT } });
    s.addImage({ data: I.compass, x: L, y: 0.85, w: 0.85, h: 0.85 });
    s.addText("CLOSING", { x: L, y: 1.85, w: 8, h: 0.35, fontFace: F, fontSize: 12, bold: true, color: ACCENT, charSpacing: 1.5, margin: 0 });
    s.addText("The one line\nto remember.", { x: L - 0.02, y: 2.3, w: 11.8, h: 2.0, fontFace: F, fontSize: 46, bold: true, color: PAPER, lineSpacingMultiple: 1.0, valign: "top", margin: 0 });
    const chips = ["Next A", "Next B", "Next C"]; let cx = L;
    chips.forEach((c) => { const w = 0.5 + c.length * 0.12; s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: 4.75, w, h: 0.62, fill: { color: PANEL }, line: { color: "3A3A42", width: 1 }, rectRadius: 0.31 });
      s.addText(c, { x: cx, y: 4.75, w, h: 0.62, fontFace: F, fontSize: 14, bold: true, color: "E6E6EA", align: "center", valign: "middle", margin: 0 }); cx += w + 0.3; });
    s.addNotes("Spoken close + thanks."); });

  TOTAL = slides.length;
  slides.forEach((fn) => fn());
  await pres.writeFile({ fileName: "Deck.pptx" });
  console.log("done");
})();
