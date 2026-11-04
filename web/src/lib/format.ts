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

export function zaloHref(zalo: string): string {
  if (zalo.startsWith("http")) return zalo;
  return `https://zalo.me/${zalo.replace(/\D/g, "")}`;
}
