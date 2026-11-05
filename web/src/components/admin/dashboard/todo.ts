import { fieldHref, type FieldKey } from "@/lib/admin/field-targets";
import { isMissingEn } from "@/lib/admin/localized";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import type {
  BrandSettings,
  ContactSettings,
  LocalizedText,
  PressMentionAdminDto,
  ProductAdminDto,
  StoryAdminDto,
  TimelineEventAdminDto,
} from "@/lib/admin/types";

export type TodoSection = "settings" | "stories" | "products" | "timeline" | "press";

export type Todo = { id: string; section: TodoSection; text: string; href: string };

/** What the lists gave. A list that failed to load is left out, and gives no rows. */
export type TodoSources = {
  products?: ProductAdminDto[];
  stories?: StoryAdminDto[];
  timeline?: TimelineEventAdminDto[];
  press?: PressMentionAdminDto[];
  contact?: ContactSettings;
  brand?: BrandSettings;
};

function blank(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

function quoted(text: LocalizedText): string {
  return `“${text.vi ?? text.en ?? "Chưa có tên"}”`;
}

function settings(contact: ContactSettings | undefined, brand: BrandSettings | undefined): Todo[] {
  const todos: Todo[] = [];
  const add = (id: string, text: string, key: FieldKey) =>
    todos.push({ id: `settings-${id}`, section: "settings", text, href: fieldHref(ADMIN_ROUTES.settings, key) });
  // A localized setting: missing as a whole, or missing only its English text.
  const text = (id: string, value: LocalizedText | null, name: string, empty: string, vi: FieldKey, en: FieldKey) => {
    if (value === null || blank(value.vi)) add(id, empty, vi);
    else if (isMissingEn(value)) add(id, `${name} chưa có tiếng Anh.`, en);
  };
  if (contact !== undefined) {
    if (blank(contact.phone)) add("phone", "Chưa có số điện thoại.", "contact.phone");
    if (blank(contact.zalo)) add("zalo", "Chưa có số Zalo.", "contact.zalo");
    text("address", contact.address, "Địa chỉ", "Chưa có địa chỉ.", "contact.address.vi", "contact.address.en");
    text("hours", contact.hours, "Giờ liên hệ", "Chưa có giờ liên hệ.", "contact.hours.vi", "contact.hours.en");
  }
  if (brand !== undefined) {
    text("tagline", brand.tagline, "Khẩu hiệu", "Chưa có khẩu hiệu.", "brand.tagline.vi", "brand.tagline.en");
  }
  return todos;
}

function stories(list: StoryAdminDto[]): Todo[] {
  return list.flatMap((story) => {
    const path = `${ADMIN_ROUTES.stories}/${story.id}`;
    const name = `Câu chuyện ${quoted(story.title)}`;
    const todo = (id: string, text: string, key: FieldKey): Todo => ({
      id: `story-${story.id}-${id}`,
      section: "stories",
      text,
      href: fieldHref(path, key),
    });
    const todos: Todo[] = [];
    if (story.status === "DRAFT") todos.push(todo("draft", `${name} còn là nháp, chưa đăng.`, "story.publish"));
    if (story.coverMediaId === null) todos.push(todo("cover", `${name} chưa có ảnh bìa.`, "story.cover"));
    const fields: [string, LocalizedText, string, FieldKey][] = [
      ["title", story.title, "Tiêu đề", "story.title.en"],
      ["excerpt", story.excerpt, "Tóm tắt", "story.excerpt.en"],
      ["body", story.bodyHtml, "Nội dung", "story.body.en"],
    ];
    for (const [id, text, label, key] of fields) {
      if (isMissingEn(text)) todos.push(todo(id, `${name} thiếu tiếng Anh ở ${label}.`, key));
    }
    return todos;
  });
}

function products(list: ProductAdminDto[]): Todo[] {
  return list.flatMap((product) => {
    const path = `${ADMIN_ROUTES.products}/${product.id}`;
    const name = `Sản phẩm ${quoted(product.name)}`;
    const todo = (id: string, text: string, key: FieldKey): Todo => ({
      id: `product-${product.id}-${id}`,
      section: "products",
      text,
      href: fieldHref(path, key),
    });
    const todos: Todo[] = [];
    // Like a draft story: a product someone made but forgot to show. It links to the switch, which opens the checks.
    if (!product.visible) todos.push(todo("hidden", `${name} đang ẩn, chưa hiện trên web.`, "product.visible"));
    const fields: [string, boolean, string, FieldKey][] = [
      ["name", isMissingEn(product.name), "Tên sản phẩm", "product.name.en"],
      ["description", isMissingEn(product.description), "Mô tả", "product.description.en"],
      // The API also marks a product with no features at all; there is nothing to translate then.
      ["features", product.features.vi.length > 0 && product.features.en.length === 0, "Đặc điểm", "product.features.en"],
      ["cookingTips", isMissingEn(product.cookingTips), "Mẹo nấu", "product.cookingTips.en"],
    ];
    for (const [id, missing, label, key] of fields) {
      if (missing) todos.push(todo(id, `${name} thiếu tiếng Anh ở ${label}.`, key));
    }
    if (product.mediaIds.length === 0) todos.push(todo("images", `${name} chưa có ảnh.`, "product.images"));
    return todos;
  });
}

function timeline(list: TimelineEventAdminDto[]): Todo[] {
  return list.flatMap((event) => {
    const name = `Mốc ${event.year} ${quoted(event.title)}`;
    const fields: [string, LocalizedText, string, FieldKey][] = [
      ["title", event.title, "Tiêu đề", "timeline.title.en"],
      ["description", event.description, "Mô tả", "timeline.description.en"],
    ];
    return fields
      .filter(([, text]) => isMissingEn(text))
      .map(([id, , label, key]) => ({
        id: `timeline-${event.id}-${id}`,
        section: "timeline" as const,
        text: `${name} thiếu tiếng Anh ở ${label}.`,
        href: fieldHref(ADMIN_ROUTES.timeline, key, { sua: event.id }),
      }));
  });
}

function press(list: PressMentionAdminDto[]): Todo[] {
  return list
    .filter((item) => isMissingEn(item.title))
    .map((item) => ({
      id: `press-${item.id}-title`,
      section: "press" as const,
      text: `Bài báo ${quoted(item.title)} thiếu tiếng Anh ở Tiêu đề.`,
      href: fieldHref(ADMIN_ROUTES.press, "press.title.en", { sua: item.id }),
    }));
}

/**
 * The dashboard's to-do list, worked out from the lists the admin API already has.
 * Each row says what is missing and links to the screen and the field where it is fixed.
 * Order: settings (the whole site uses them), stories, products, timeline, press.
 * Images without a description are not listed: the API refuses an image without both texts (decision 0008).
 */
export function buildTodos(sources: TodoSources): Todo[] {
  return [
    ...settings(sources.contact, sources.brand),
    ...stories(sources.stories ?? []),
    ...products(sources.products ?? []),
    ...timeline(sources.timeline ?? []),
    ...press(sources.press ?? []),
  ];
}
