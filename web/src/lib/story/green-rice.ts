/**
 * Step 2 shows the rice growing: young rice, then green rice, then the ripe gold rice of the
 * sketch. The green rice is the sketch itself with its gold rice turned green, so the lines are
 * the same. It is made here, in the browser, from the sketch that is already loaded: as a file it
 * would weigh as much as the sketch (about 150 KB).
 */

/** Ripe rice: hue in degrees, saturation and value 0..1, below this row of the 675 px picture. */
const RICE_HUE_MIN = 33;
const RICE_HUE_MAX = 62;
const RICE_SAT_MIN = 0.42;
const RICE_VALUE_MIN = 0.3;
const RICE_TOP_PART = 200 / 675;
/** Green rice: the hue moves by this many degrees and the colour is a little softer. */
const GREEN_SHIFT = 45;
const GREEN_SAT = 0.8;

/** Rows recoloured in one go: about 70 000 pixels, a few milliseconds on a phone. */
const BAND_ROWS = 60;

/**
 * Turns the gold rice pixels of an RGBA buffer green, in place. The buffer holds `rows` rows of
 * the picture, starting at picture row `firstRow` of a picture `pictureHeight` rows high.
 */
export function greenRicePixels(
  data: Uint8ClampedArray,
  width: number,
  rows: number,
  firstRow = 0,
  pictureHeight = rows,
): void {
  const top = Math.max(Math.round(pictureHeight * RICE_TOP_PART) - firstRow, 0);
  for (let y = top; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      if (max < RICE_VALUE_MIN || max === 0 || delta / max < RICE_SAT_MIN) continue;
      let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
      if (hue <= RICE_HUE_MIN || hue >= RICE_HUE_MAX) continue;
      const [nr, ng, nb] = hsvToRgb((hue + GREEN_SHIFT) % 360, (delta / max) * GREEN_SAT, max);
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    }
  }
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Lets the page run (scroll, paint other motion) before the next band. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * A canvas with the green-rice picture, or null when the browser cannot read the sketch. It
 * works in bands of rows with a pause before each: in one go it blocks the page for 50 to 80 ms
 * on a fast computer, which drops frames of the motion playing at the same time.
 */
export async function greenRiceCanvas(
  img: HTMLImageElement,
  doc: Document,
  pause: () => Promise<void> = nextTask,
): Promise<HTMLCanvasElement | null> {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (width === 0 || height === 0) return null;
  const canvas = doc.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    // Decoded off the main thread, so drawImage does not decode it.
    await img.decode().catch(() => {});
    ctx.drawImage(img, 0, 0);
    for (let y = Math.round(height * RICE_TOP_PART); y < height; y += BAND_ROWS) {
      await pause();
      const rows = Math.min(BAND_ROWS, height - y);
      const band = ctx.getImageData(0, y, width, rows);
      greenRicePixels(band.data, width, rows, y, height);
      ctx.putImageData(band, 0, y);
    }
  } catch {
    // A tainted canvas or a missing 2D context: the step plays without the green stage.
    return null;
  }
  return canvas;
}
