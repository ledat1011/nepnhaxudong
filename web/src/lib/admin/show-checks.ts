import type { FieldKey } from "./field-targets";
import { isMissingEn } from "./localized";
import type { ProductAdminDto } from "./types";

export type ShowCheckKey = "images" | "en" | "packagings";

/**
 * One line of the check panel that opens before a product is shown on the website.
 * `fix` is the field "Quay lại sửa" goes to when the line is a gap.
 */
export type ShowCheck = { key: ShowCheckKey; ok: boolean; label: string; fix: FieldKey };

/** The English parts a visitor of the English page would miss, in the order of the form. */
function missingEnglish(product: ProductAdminDto): { part: string; fix: FieldKey }[] {
  const parts: { part: string; fix: FieldKey; missing: boolean }[] = [
    { part: "tên", fix: "product.name.en", missing: isMissingEn(product.name) },
    { part: "mô tả", fix: "product.description.en", missing: isMissingEn(product.description) },
    {
      part: "đặc điểm",
      fix: "product.features.en",
      missing: product.features.vi.length > 0 && product.features.en.length === 0,
    },
    { part: "mẹo nấu", fix: "product.cookingTips.en", missing: isMissingEn(product.cookingTips) },
  ];
  return parts.filter((entry) => entry.missing);
}

/**
 * What a visitor will see, checked on the saved product (the switch is locked while there are unsaved changes).
 * A gap does not block: the user may still choose "Vẫn hiện". Decision 0010, item 2: photo, English, packaging.
 */
export function showChecks(product: ProductAdminDto): ShowCheck[] {
  const hasImages = product.mediaIds.length > 0;
  const english = missingEnglish(product);
  const hasPackagings = product.packagings.length > 0;
  return [
    { key: "images", ok: hasImages, label: hasImages ? "Có ảnh" : "Chưa có ảnh", fix: "product.images" },
    {
      key: "en",
      ok: english.length === 0,
      label:
        english.length === 0
          ? "Có bản tiếng Anh"
          : english[0].part === "tên"
            ? "Chưa có bản tiếng Anh"
            : `Bản tiếng Anh còn thiếu: ${english.map((entry) => entry.part).join(", ")}`,
      fix: english[0]?.fix ?? "product.name.en",
    },
    {
      key: "packagings",
      ok: hasPackagings,
      label: hasPackagings ? "Có quy cách đóng gói" : "Chưa có quy cách đóng gói",
      fix: "product.packagings",
    },
  ];
}

/** The first line that is a gap, or `null` when the product has everything. */
export function firstGap(product: ProductAdminDto): ShowCheck | null {
  return showChecks(product).find((check) => !check.ok) ?? null;
}
