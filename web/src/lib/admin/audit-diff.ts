import type { AuditAction } from "./types";

export type DiffRow = { path: string; before: string | null; after: string | null };

const MAX_TEXT = 200;
/** Snapshots are free JSON. These limits keep a huge or deeply nested one from freezing the page. */
const MAX_DEPTH = 32;
const MAX_LEAVES = 2000;
const SCALAR_PATH = "(giá trị)";
const TRUNCATED_PATH = "…";
const TRUNCATED_NOTE = "Còn nhiều trường nữa, không hiện hết.";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  product: "Sản phẩm",
  timeline_event: "Hành trình",
  press_mention: "Báo chí",
  story: "Câu chuyện",
  media: "Ảnh",
  site_setting: "Cài đặt",
  app_user: "Tài khoản",
};

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Tạo",
  UPDATE: "Sửa",
  DELETE: "Xóa",
  RESTORE: "Khôi phục",
};

export function entityTypeLabel(entityType: string): string {
  return Object.hasOwn(ENTITY_TYPE_LABELS, entityType) ? ENTITY_TYPE_LABELS[entityType] : entityType;
}

export function actionLabel(action: AuditAction): string {
  return ACTION_LABELS[action] ?? action;
}

const VN_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Ho_Chi_Minh",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

/** An ISO instant as "08:00 04/11/2026" in Vietnam time, whatever the time zone of this machine is. */
export function formatVnTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-GB", VN_TIME_OPTIONS).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")} ${part("day")}/${part("month")}/${part("year")}`;
}

/** The value as text only. A leaf is a scalar, an empty container, or a container cut off at the depth limit. */
function leafText(value: unknown): string {
  if (Array.isArray(value)) return value.length === 0 ? "[]" : "[…]";
  if (value !== null && typeof value === "object") return Object.keys(value).length === 0 ? "{}" : "{…}";
  return String(value);
}

type Flat = { leaves: Map<string, string>; truncated: boolean };

function flatten(value: unknown): Flat {
  const flat: Flat = { leaves: new Map(), truncated: false };
  const isContainer = (v: unknown) => v !== null && typeof v === "object";
  if (!isContainer(value)) {
    // A missing side (null for a create or a delete line) has no paths at all.
    if (value !== undefined && value !== null) flat.leaves.set(SCALAR_PATH, leafText(value));
    return flat;
  }
  const walk = (node: unknown, path: string, depth: number) => {
    if (flat.leaves.size >= MAX_LEAVES) {
      flat.truncated = true;
      return;
    }
    const empty = isContainer(node) && Object.keys(node as object).length === 0;
    if (!isContainer(node) || empty || depth >= MAX_DEPTH) {
      flat.leaves.set(path, leafText(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, path === "" ? String(index) : `${path}.${index}`, depth + 1));
      return;
    }
    for (const key of Object.keys(node as object)) {
      walk((node as Record<string, unknown>)[key], path === "" ? key : `${path}.${key}`, depth + 1);
    }
  };
  walk(value, "", 0);
  return flat;
}

function shorten(text: string): string {
  if (text.length <= MAX_TEXT) return text;
  let cut = text.slice(0, MAX_TEXT);
  // Do not end on the first half of a surrogate pair (an emoji).
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return `${cut}…`;
}

const COLLATOR = new Intl.Collator("en", { numeric: true });

type FieldLabel = { label: string; value(text: string): string };

const YES_NO: FieldLabel["value"] = (text) => (text === "true" ? "Có" : text === "false" ? "Không" : text);

/**
 * Paths shown with a name and a value a family member reads, by entity type. Every other path keeps its raw name,
 * as before. A product's "visible" is the "Hiện trên web" switch.
 */
const FIELD_LABELS: Record<string, Record<string, FieldLabel>> = {
  product: { visible: { label: "Hiện trên web", value: YES_NO } },
};

function labelled(row: DiffRow, entityType: string | undefined): DiffRow {
  const labels = entityType !== undefined && Object.hasOwn(FIELD_LABELS, entityType) ? FIELD_LABELS[entityType] : null;
  const field = labels !== null && Object.hasOwn(labels, row.path) ? labels[row.path] : null;
  if (field === null) return row;
  return {
    path: field.label,
    before: row.before === null ? null : field.value(row.before),
    after: row.after === null ? null : field.value(row.after),
  };
}

/**
 * Compares two stored copies of one entity and lists the paths whose value differs, sorted by path.
 * A path that exists on one side only has `null` on the other side; a JSON `null` is the text "null".
 * Values are text only. A text longer than 200 characters is cut and ends with "…".
 * With `entityType`, a path listed in FIELD_LABELS gets its readable name and values (sorted by the raw path still).
 */
export function diffSnapshots(before: unknown, after: unknown, entityType?: string): DiffRow[] {
  const left = flatten(before);
  const right = flatten(after);
  const rows: DiffRow[] = [];
  for (const path of new Set([...left.leaves.keys(), ...right.leaves.keys()])) {
    const a = left.leaves.get(path);
    const b = right.leaves.get(path);
    if (a === b) continue;
    rows.push({ path, before: a === undefined ? null : shorten(a), after: b === undefined ? null : shorten(b) });
  }
  rows.sort((x, y) => COLLATOR.compare(x.path, y.path));
  const named = rows.map((row) => labelled(row, entityType));
  if (left.truncated || right.truncated) {
    named.push({ path: TRUNCATED_PATH, before: TRUNCATED_NOTE, after: TRUNCATED_NOTE });
  }
  return named;
}
