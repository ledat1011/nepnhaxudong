import type { Lang } from "@/lib/i18n/langs";

const LOCALE: Record<Lang, string> = { vi: "vi-VN", en: "en-US" };
const TIME_ZONE = "Asia/Ho_Chi_Minh";
const GRAMS_PER_KG = 1000;

export function formatPrice(vnd: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(vnd);
}

export function formatWeight(grams: number, lang: Lang): string {
  const format = new Intl.NumberFormat(LOCALE[lang], {
    maximumFractionDigits: 1,
  });
  return grams >= GRAMS_PER_KG
    ? `${format.format(grams / GRAMS_PER_KG)} kg`
    : `${format.format(grams)} g`;
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    dateStyle: "long",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

// A link, not a number: with http(s), or a zalo.me link typed without it ("zalo.me/g/abc").
const ZALO_LINK = /^(https?:\/\/|zalo\.me)/i;
// The country code of Vietnam, written as +84 or 0084.
const COUNTRY_CODE = /^(\+|00)84/;

/**
 * Digits of a Zalo number in the local form with a leading 0 ("+84 912 345 678" gives
 * "0912345678"), which Zalo search and zalo.me links use. Null for a link or no digits.
 */
export function zaloNumber(zalo: string): string | null {
  const value = zalo.trim();
  if (ZALO_LINK.test(value)) return null;
  const local = COUNTRY_CODE.test(value) ? `0${value.replace(COUNTRY_CODE, "")}` : value;
  const digits = local.replace(/\D/g, "");
  return digits === "" ? null : digits;
}

/** The zalo.me link of the chat: the setting itself when it is a link, else built from the number. */
export function zaloHref(zalo: string): string {
  const value = zalo.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (ZALO_LINK.test(value)) return `https://${value}`;
  return `https://zalo.me/${zaloNumber(value) ?? ""}`;
}
