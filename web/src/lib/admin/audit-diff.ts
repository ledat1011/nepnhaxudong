import type { AuditAction, AuditEntryDto } from "./types";

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

/** Shown for a line whose user no longer exists (the API sends no name then). */
export const DELETED_USER_LABEL = "Tài khoản đã xóa";

/** The second line of a history row: when, who, what kind, which action. */
export function entryMeta(entry: Pick<AuditEntryDto, "createdAt" | "userDisplayName" | "entityType" | "action">): string {
  const user = entry.userDisplayName?.trim() ? entry.userDisplayName : DELETED_USER_LABEL;
  return [formatVnTime(entry.createdAt), user, entityTypeLabel(entry.entityType), actionLabel(entry.action)].join(" · ");
}

/** Shown for an item that has no title (the API then labels it with its id, "#12"). */
export const UNTITLED = "(chưa có tiêu đề)";

/** The first line of a history row: the name of the item. */
export function entryTitle(entry: Pick<AuditEntryDto, "label">): string {
  return entry.label.trim() === "" || /^#\d+$/.test(entry.label) ? UNTITLED : entry.label;
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

type FieldLabel = { label: string; value?(text: string): string };

const YES_NO = (text: string) => (text === "true" ? "Có" : text === "false" ? "Không" : text);
const ON_OFF = (text: string) => (text === "true" ? "Bật" : text === "false" ? "Tắt" : text);
const words = (map: Record<string, string>) => (text: string) => (Object.hasOwn(map, text) ? map[text] : text);
const ROLE = words({ OWNER: "Chủ", MEMBER: "Người nhà" });
const STORY_STATUS = words({ DRAFT: "Nháp", PUBLISHED: "Đã đăng" });
const SETTING_KEY = words({ contact: "Liên hệ", social: "Mạng xã hội", brand: "Thương hiệu" });

/** "150000" as "150.000", the way a Vietnamese reader groups the thousands. Other text is left as it is. */
function grouped(text: string): string {
  return /^\d+$/.test(text) ? text.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : text;
}
const MONEY = (text: string) => (/^\d+$/.test(text) ? `${grouped(text)} đ` : text);
const GRAMS = (text: string) => (/^\d+$/.test(text) ? `${grouped(text)} g` : text);
/** "2024-05-01" as "01/05/2024". */
const DAY = (text: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match === null ? text : `${match[3]}/${match[2]}/${match[1]}`;
};

/** Fields every kind has. */
const COMMON_LABELS: Record<string, FieldLabel> = {
  id: { label: "Mã số" },
  sortOrder: { label: "Thứ tự" },
  missingEn: { label: "Còn thiếu tiếng Anh", value: YES_NO },
};

/**
 * The name of each field, by kind of content, as the edit screens call it. A key is the path with every list
 * position written "#" and the language ("vi", "en") left out; "{1}" in a label is the first position, counted from 1.
 */
const FIELD_LABELS: Record<string, Record<string, FieldLabel>> = {
  product: {
    visible: { label: "Hiện trên web", value: YES_NO },
    showPrice: { label: "Hiện giá", value: YES_NO },
    name: { label: "Tên sản phẩm" },
    description: { label: "Mô tả" },
    features: { label: "Đặc điểm" },
    "features.#": { label: "Đặc điểm {1}" },
    cookingTips: { label: "Mẹo nấu" },
    packagings: { label: "Quy cách" },
    "packagings.#.weightGrams": { label: "Quy cách {1}: khối lượng", value: GRAMS },
    "packagings.#.priceVnd": { label: "Quy cách {1}: giá", value: MONEY },
    "packagings.#.sortOrder": { label: "Quy cách {1}: thứ tự" },
    mediaIds: { label: "Ảnh" },
    "mediaIds.#": { label: "Ảnh {1} (mã ảnh)" },
  },
  timeline_event: {
    year: { label: "Năm" },
    title: { label: "Tiêu đề" },
    description: { label: "Mô tả" },
    mediaId: { label: "Ảnh (mã ảnh)" },
  },
  press_mention: {
    url: { label: "Đường dẫn bài báo" },
    sourceName: { label: "Tên báo" },
    publishedOn: { label: "Ngày đăng", value: DAY },
    title: { label: "Tiêu đề" },
    mediaId: { label: "Ảnh (mã ảnh)" },
  },
  story: {
    status: { label: "Trạng thái", value: STORY_STATUS },
    publishedAt: { label: "Thời điểm đăng", value: formatVnTime },
    coverMediaId: { label: "Ảnh bìa (mã ảnh)" },
    slug: { label: "Đường dẫn" },
    title: { label: "Tiêu đề" },
    excerpt: { label: "Tóm tắt" },
    bodyHtml: { label: "Nội dung" },
  },
  media: {
    url: { label: "Đường dẫn ảnh" },
    width: { label: "Chiều rộng (điểm ảnh)" },
    height: { label: "Chiều cao (điểm ảnh)" },
    mime: { label: "Loại tệp" },
    altVi: { label: "Mô tả ảnh (tiếng Việt)" },
    altEn: { label: "Mô tả ảnh (tiếng Anh)" },
  },
  site_setting: {
    key: { label: "Loại cài đặt", value: SETTING_KEY },
    value: { label: "Nội dung cài đặt" },
    "value.phone": { label: "Điện thoại" },
    "value.zalo": { label: "Số Zalo" },
    "value.messenger": { label: "Messenger" },
    "value.address": { label: "Địa chỉ" },
    "value.mapUrl": { label: "Đường dẫn bản đồ" },
    "value.hours": { label: "Giờ liên hệ" },
    "value.facebook": { label: "Facebook" },
    "value.youtube": { label: "YouTube" },
    "value.tiktok": { label: "TikTok" },
    "value.tagline": { label: "Khẩu hiệu" },
  },
  app_user: {
    email: { label: "Email" },
    displayName: { label: "Tên hiển thị" },
    enabled: { label: "Được đăng nhập", value: YES_NO },
    role: { label: "Vai trò", value: ROLE },
    totpEnabled: { label: "Xác thực 2 lớp", value: ON_OFF },
    mustChangePassword: { label: "Phải đổi mật khẩu", value: YES_NO },
    mustSetupTotp: { label: "Phải bật lại xác thực 2 lớp", value: YES_NO },
    totpRequired: { label: "Bắt buộc xác thực 2 lớp", value: YES_NO },
  },
};

const LANGUAGES: Record<string, string> = { vi: "tiếng Việt", en: "tiếng Anh" };

/** The readable name of a raw path such as "packagings.1.priceVnd", or `null` when the path is not known. */
function fieldOf(path: string, entityType: string): { label: string; value?(text: string): string } | null {
  const shape: string[] = [];
  const positions: number[] = [];
  let language: string | null = null;
  for (const segment of path.split(".")) {
    if (/^\d+$/.test(segment)) {
      positions.push(Number(segment) + 1);
      shape.push("#");
    } else if (language === null && shape.length > 0 && Object.hasOwn(LANGUAGES, segment)) {
      language = segment;
    } else {
      shape.push(segment);
    }
  }
  const key = shape.join(".");
  const labels = Object.hasOwn(FIELD_LABELS, entityType) ? FIELD_LABELS[entityType] : {};
  const field = Object.hasOwn(labels, key) ? labels[key] : Object.hasOwn(COMMON_LABELS, key) ? COMMON_LABELS[key] : null;
  if (field === null) return null;
  const label = field.label.replace(/\{(\d)\}/g, (_, n: string) => String(positions[Number(n) - 1] ?? ""));
  return { label: language === null ? label : `${label} (${LANGUAGES[language]})`, value: field.value };
}

/** JSON null and an empty list or object mean "nothing typed": the detail shows them as empty. */
const EMPTY_TEXTS = new Set(["null", "[]", "{}"]);

function labelled(row: DiffRow, entityType: string | undefined): DiffRow | null {
  const field = entityType === undefined ? null : fieldOf(row.path, entityType);
  if (field === null) return row;
  const text = (value: string | null) => {
    if (value === null || EMPTY_TEXTS.has(value)) return null;
    return field.value === undefined ? value : field.value(value);
  };
  const before = text(row.before);
  const after = text(row.after);
  // Empty on both sides (an English text never typed, on a create line) says nothing.
  if (before === null && after === null) return null;
  return { path: field.label, before, after };
}

/**
 * Compares two stored copies of one entity and lists the paths whose value differs, sorted by path.
 * A path that exists on one side only has `null` on the other side; a JSON `null` is the text "null".
 * Values are text only. A text longer than 200 characters is cut and ends with "…".
 * With `entityType`, a known path gets its readable name and values (sorted by the raw path still), and a known
 * field that is empty on both sides is left out. An unknown path keeps its raw name.
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
  const named = rows.map((row) => labelled(row, entityType)).filter((row): row is DiffRow => row !== null);
  if (left.truncated || right.truncated) {
    named.push({ path: TRUNCATED_PATH, before: TRUNCATED_NOTE, after: TRUNCATED_NOTE });
  }
  return named;
}
