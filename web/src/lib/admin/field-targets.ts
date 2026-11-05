/**
 * Links that open a screen at one field ("?o=<key>"), for the to-do list of the dashboard.
 * A field is found by what the user sees, so the forms need no extra ids:
 * - `tab`: the tab to open first (the English tab of a story, a settings tab);
 * - `group`: the box around the field (the legend of its fieldset, for example "Mô tả");
 * - `label`: the field's label, its aria-label, or the text of a button.
 * A trailing "*" (required) and extra words after the text (a "Thiếu EN" badge) do not matter.
 */
export type FieldTarget = { tab?: string; group?: string; label: string };

export const FIELD_TARGETS = {
  "product.name.en": { group: "Tên sản phẩm", label: "English" },
  "product.description.en": { group: "Mô tả", label: "English" },
  "product.features.en": { group: "Đặc điểm", label: "Đặc điểm 1 (English)" },
  "product.cookingTips.en": { group: "Mẹo nấu", label: "English" },
  "product.images": { group: "Ảnh", label: "Chọn ảnh" },
  "product.packagings": { group: "Quy cách đóng gói", label: "Thêm quy cách" },
  "product.visible": { label: "Hiện trên web" },
  "story.publish": { label: "Đăng bài" },
  "story.cover": { group: "Ảnh bìa", label: "Chọn ảnh" },
  "story.title.en": { tab: "English", label: "Tiêu đề" },
  "story.excerpt.en": { tab: "English", label: "Tóm tắt" },
  "story.body.en": { tab: "English", label: "Nội dung" },
  "timeline.title.en": { group: "Tiêu đề", label: "English" },
  "timeline.description.en": { group: "Mô tả", label: "English" },
  "press.title.en": { group: "Tiêu đề", label: "English" },
  "contact.phone": { tab: "Liên hệ", label: "Điện thoại" },
  "contact.zalo": { tab: "Liên hệ", label: "Zalo" },
  "contact.address.vi": { tab: "Liên hệ", group: "Địa chỉ", label: "Tiếng Việt" },
  "contact.address.en": { tab: "Liên hệ", group: "Địa chỉ", label: "English" },
  "contact.hours.vi": { tab: "Liên hệ", group: "Giờ liên hệ", label: "Tiếng Việt" },
  "contact.hours.en": { tab: "Liên hệ", group: "Giờ liên hệ", label: "English" },
  "brand.tagline.vi": { tab: "Thương hiệu", group: "Khẩu hiệu", label: "Tiếng Việt" },
  "brand.tagline.en": { tab: "Thương hiệu", group: "Khẩu hiệu", label: "English" },
} as const satisfies Record<string, FieldTarget>;

export type FieldKey = keyof typeof FIELD_TARGETS;

export const FIELD_PARAM = "o";

/** `path` with the field to open, for example `/admin/san-pham/3?o=product.description.en`. */
export function fieldHref(path: string, key: FieldKey, extra: Record<string, string | number> = {}): string {
  const query = [...Object.entries(extra).map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`), `${FIELD_PARAM}=${key}`];
  return `${path}?${query.join("&")}`;
}

export function fieldTarget(key: string | null): FieldTarget | null {
  return key !== null && Object.hasOwn(FIELD_TARGETS, key) ? FIELD_TARGETS[key as FieldKey] : null;
}

/** The visible words of an element. Text of separate elements is kept apart: "Mô tả" + badge "Thiếu EN". */
function words(element: Element): string {
  const parts: string[] = [];
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) parts.push(node.textContent ?? "");
  return parts.join(" ").replace(/\*/g, " ").replace(/\s+/g, " ").trim();
}

function matches(text: string, wanted: string): boolean {
  return text === wanted || text.startsWith(`${wanted} `);
}

function shown(element: Element): boolean {
  return element.closest("[hidden]") === null;
}

function controlOf(label: HTMLLabelElement): HTMLElement | null {
  if (label.htmlFor !== "") return label.ownerDocument.getElementById(label.htmlFor);
  return label.querySelector("input, textarea, select");
}

/** The tab to open first, when it is not open yet; `null` when there is none or it is open. */
export function closedTab(root: ParentNode, target: FieldTarget): HTMLElement | "missing" | null {
  if (target.tab === undefined) return null;
  const tab = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]')).find(
    (element) => shown(element) && words(element) === target.tab,
  );
  if (tab === undefined) return "missing";
  return tab.getAttribute("aria-selected") === "true" ? null : tab;
}

/** The field the target points to, if it is on the page and not hidden. */
export function findField(root: ParentNode, target: FieldTarget): HTMLElement | null {
  const scopes: ParentNode[] =
    target.group === undefined
      ? [root]
      : Array.from(root.querySelectorAll("fieldset")).filter((fieldset) => {
          const legend = Array.from(fieldset.children).find((child) => child.tagName === "LEGEND");
          return legend !== undefined && shown(fieldset) && matches(words(legend), target.group as string);
        });
  for (const scope of scopes) {
    for (const label of Array.from(scope.querySelectorAll("label"))) {
      const control = controlOf(label);
      if (control !== null && shown(control) && matches(words(label), target.label)) return control;
    }
    for (const element of Array.from(scope.querySelectorAll<HTMLElement>("[aria-label]"))) {
      if (shown(element) && (element.getAttribute("aria-label") ?? "").trim() === target.label) return element;
    }
    for (const button of Array.from(scope.querySelectorAll("button"))) {
      if (shown(button) && words(button) === target.label) return button;
    }
  }
  return null;
}
