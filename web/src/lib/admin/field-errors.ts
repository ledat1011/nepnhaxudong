import type { AdminApiError } from "./errors";

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
  /** The text shown under the box, when the form names the field another way than the API. */
  text?: (detail: string) => string;
};

/** The field the API message is about, or null when no rule matches. The first matching rule wins. */
export function fieldOfDetail(detail: string, rules: readonly FieldRule[]): string | null {
  const rule = rules.find((candidate) => detail.startsWith(candidate.prefix));
  if (rule === undefined) return null;
  return typeof rule.field === "string" ? rule.field : rule.field(detail);
}

/**
 * The API joins several validation messages with a space (`handleMethodArgumentNotValid`). Each one is a
 * sentence that ends with a period, so a period followed by a space and a capital letter starts the next one.
 */
export function splitDetail(detail: string): string[] {
  return detail
    .split(/(?<=\.)\s+(?=\p{Lu})/u)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/**
 * Each sentence of an API message goes to the field it names. `rest` holds the sentences that name no
 * field (or null), for the general message of the form.
 */
export function mapApiDetail(detail: string, rules: readonly FieldRule[]): { errors: FieldErrors; rest: string | null } {
  const errors: Record<string, string> = {};
  const rest: string[] = [];
  for (const part of splitDetail(detail)) {
    const rule = rules.find((candidate) => part.startsWith(candidate.prefix));
    if (rule === undefined) {
      rest.push(part);
      continue;
    }
    const field = typeof rule.field === "string" ? rule.field : rule.field(part);
    const text = rule.text?.(part) ?? part;
    errors[field] = errors[field] === undefined ? text : `${errors[field]} ${text}`;
  }
  return { errors, rest: rest.length > 0 ? rest.join(" ") : null };
}

/** The part of a failed save that is not shown under a field, or null. */
export function apiRest(error: AdminApiError | null, rules: readonly FieldRule[]): string | null {
  return error === null ? null : mapApiDetail(error.detail, rules).rest;
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
