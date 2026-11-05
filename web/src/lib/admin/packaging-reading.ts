import { formatWeight } from "@/lib/format";

/** Below this weight a pack size is most likely kilograms typed into the gram box. */
const LOW_WEIGHT_GRAMS = 100;
/** Below this price the price is most likely thousands typed without the zeros. */
const LOW_PRICE_VND = 1000;

const VND_NUMBER = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

/** The whole number in a box, or null for an empty box or anything else. */
function wholeNumber(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

function vnd(amount: number): string {
  return `${VND_NUMBER.format(amount)} đ`;
}

/** The weight as the public site writes it ("= 2 kg", "= 500 g"), or null when the box holds no weight. */
export function weightReading(text: string): string | null {
  const grams = wholeNumber(text);
  return grams === null || grams === 0 ? null : `= ${formatWeight(grams, "vi")}`;
}

/** A note when the weight is so small that the user probably typed kilograms. */
export function weightWarning(text: string): string | null {
  const grams = wholeNumber(text);
  if (grams === null || grams === 0 || grams >= LOW_WEIGHT_GRAMS) return null;
  return `Ô này tính bằng gam. Nếu là ${grams} kg, hãy gõ ${grams * 1000}.`;
}

/** The price as people read it ("= 150.000 đ"), or null when the box holds no price. */
export function priceReading(text: string): string | null {
  const amount = wholeNumber(text);
  return amount === null ? null : `= ${vnd(amount)}`;
}

/** A note when the price is 0, or so small that the user probably left out the thousands. */
export function priceWarning(text: string): string | null {
  const amount = wholeNumber(text);
  if (amount === null || amount >= LOW_PRICE_VND) return null;
  if (amount === 0) return "Trang web sẽ ghi 0 đ. Để trống ô này nếu muốn ghi “Giá liên hệ”.";
  return `Giá dưới ${vnd(LOW_PRICE_VND)}. Nếu là ${vnd(amount * 1000)}, hãy gõ ${amount * 1000}.`;
}
