/** The error text of each wrong field of a form, by field key (for example "name.vi" or "year"). */
export type FieldErrors = Readonly<Record<string, string>>;

export type Lang = "vi" | "en";

/** Shown next to the Save button while a field has an error. */
export const NOT_SAVED_NOTICE = "Chưa lưu. Hãy sửa ô có viền đỏ.";

/**
 * The API names the field at the start of its message (see `SettingRules` and the services of the API),
 * for example "Tên sản phẩm (tiếng Việt) không được để trống.". A rule maps such a start to a field key.
 */
export type FieldRule = {
  prefix: string;
  field: string | ((detail: string) => string);
};

/** The field the API message is about, or null when no rule matches. The first matching rule wins. */
export function fieldOfDetail(detail: string, rules: readonly FieldRule[]): string | null {
  const rule = rules.find((candidate) => detail.startsWith(candidate.prefix));
  if (rule === undefined) return null;
  return typeof rule.field === "string" ? rule.field : rule.field(detail);
}

/** The language named in brackets in an API message, or `fallback` when the message names none. */
export function langOfDetail(detail: string, fallback: Lang = "vi"): Lang {
  if (detail.includes("(tiếng Anh)")) return "en";
  if (detail.includes("(tiếng Việt)")) return "vi";
  return fallback;
}

/**
 * The errors without the given fields. A key that ends in a dot removes every field that starts with it.
 * Returns the same object when nothing was removed, so a React state update can be skipped.
 */
export function withoutFields(errors: FieldErrors, keys: readonly string[]): FieldErrors {
  const drop = (field: string) => keys.some((key) => (key.endsWith(".") ? field.startsWith(key) : field === key));
  if (!Object.keys(errors).some(drop)) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([field]) => !drop(field)));
}

/** The props that mark a box as wrong and link it to the error text below it. */
export function invalidProps(id: string, error: string | null | undefined) {
  return error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};
}
