import { describe, expect, it } from "vitest";
import type {
  ContactSettings,
  PressMentionAdminDto,
  ProductAdminDto,
  StoryAdminDto,
  TimelineEventAdminDto,
} from "@/lib/admin/types";
import { buildTodos } from "./todo";

const FULL_CONTACT: ContactSettings = {
  phone: "0912345678",
  zalo: "0912345678",
  messenger: null,
  address: { vi: "Xuân Đông", en: "Xuan Dong" },
  mapUrl: null,
  hours: { vi: "7 giờ đến 21 giờ", en: "7 am to 9 pm" },
};
const FULL_BRAND = { tagline: { vi: "Nếp nhà", en: "Family rice" } };

function product(over: Partial<ProductAdminDto> = {}): ProductAdminDto {
  return {
    id: 3,
    sortOrder: 1,
    showPrice: true,
    name: { vi: "Gạo nếp", en: "Sticky rice" },
    description: { vi: "Hạt tròn", en: "Round grains" },
    features: { vi: ["Thơm"], en: ["Fragrant"] },
    cookingTips: { vi: null, en: null },
    packagings: [],
    mediaIds: [1],
    missingEn: false,
    ...over,
  };
}

function story(over: Partial<StoryAdminDto> = {}): StoryAdminDto {
  return {
    id: 5,
    status: "PUBLISHED",
    publishedAt: "2026-11-01T00:00:00Z",
    coverMediaId: 2,
    slug: { vi: "mua-gat", en: "harvest" },
    title: { vi: "Mùa gặt", en: "Harvest" },
    excerpt: { vi: null, en: null },
    bodyHtml: { vi: "<p>Lúa</p>", en: "<p>Rice</p>" },
    missingEn: false,
    ...over,
  };
}

function event(over: Partial<TimelineEventAdminDto> = {}): TimelineEventAdminDto {
  return {
    id: 7,
    year: 1990,
    sortOrder: 1,
    title: { vi: "Ông trồng lúa", en: "Grandfather plants rice" },
    description: { vi: null, en: null },
    mediaId: null,
    missingEn: false,
    ...over,
  };
}

function press(over: Partial<PressMentionAdminDto> = {}): PressMentionAdminDto {
  return {
    id: 9,
    url: "https://baochi.example/1",
    sourceName: "Báo Hải Dương",
    publishedOn: null,
    title: { vi: "Làng nếp", en: "Rice village" },
    mediaId: null,
    sortOrder: 1,
    missingEn: false,
    ...over,
  };
}

const complete = {
  products: [product()],
  stories: [story()],
  timeline: [event()],
  press: [press()],
  contact: FULL_CONTACT,
  brand: FULL_BRAND,
};

describe("buildTodos", () => {
  it("is empty when everything is filled in", () => {
    expect(buildTodos(complete)).toEqual([]);
  });

  it("names each product field without English and links to that field of that product", () => {
    const todos = buildTodos({
      ...complete,
      products: [
        product({
          description: { vi: "Hạt tròn", en: null },
          features: { vi: ["Thơm"], en: [] },
          cookingTips: { vi: "Ngâm 6 giờ", en: null },
          missingEn: true,
        }),
      ],
    });
    expect(todos).toEqual([
      { id: "product-3-description", section: "products", text: "Sản phẩm “Gạo nếp” thiếu tiếng Anh ở Mô tả.", href: "/admin/san-pham/3?o=product.description.en" },
      { id: "product-3-features", section: "products", text: "Sản phẩm “Gạo nếp” thiếu tiếng Anh ở Đặc điểm.", href: "/admin/san-pham/3?o=product.features.en" },
      { id: "product-3-cookingTips", section: "products", text: "Sản phẩm “Gạo nếp” thiếu tiếng Anh ở Mẹo nấu.", href: "/admin/san-pham/3?o=product.cookingTips.en" },
    ]);
  });

  it("does not count an empty feature list as missing English", () => {
    expect(buildTodos({ ...complete, products: [product({ features: { vi: [], en: [] }, missingEn: true })] })).toEqual([]);
  });

  it("lists a product without a photo", () => {
    expect(buildTodos({ ...complete, products: [product({ mediaIds: [] })] })).toEqual([
      { id: "product-3-images", section: "products", text: "Sản phẩm “Gạo nếp” chưa có ảnh.", href: "/admin/san-pham/3?o=product.images" },
    ]);
  });

  it("lists a draft story first, then its missing cover and English parts", () => {
    const todos = buildTodos({
      ...complete,
      stories: [
        story({
          status: "DRAFT",
          publishedAt: null,
          coverMediaId: null,
          title: { vi: "Mùa gặt", en: null },
          excerpt: { vi: "Tóm tắt", en: null },
          bodyHtml: { vi: "<p>Lúa</p>", en: null },
          missingEn: true,
        }),
      ],
    });
    expect(todos.map((todo) => [todo.text, todo.href])).toEqual([
      ["Câu chuyện “Mùa gặt” còn là nháp, chưa đăng.", "/admin/cau-chuyen/5?o=story.publish"],
      ["Câu chuyện “Mùa gặt” chưa có ảnh bìa.", "/admin/cau-chuyen/5?o=story.cover"],
      ["Câu chuyện “Mùa gặt” thiếu tiếng Anh ở Tiêu đề.", "/admin/cau-chuyen/5?o=story.title.en"],
      ["Câu chuyện “Mùa gặt” thiếu tiếng Anh ở Tóm tắt.", "/admin/cau-chuyen/5?o=story.excerpt.en"],
      ["Câu chuyện “Mùa gặt” thiếu tiếng Anh ở Nội dung.", "/admin/cau-chuyen/5?o=story.body.en"],
    ]);
  });

  it("opens the edit dialog of a timeline event or a press item, at the field", () => {
    const todos = buildTodos({
      ...complete,
      timeline: [event({ title: { vi: "Ông trồng lúa", en: null }, description: { vi: "Ruộng", en: null } })],
      press: [press({ title: { vi: "Làng nếp", en: null } })],
    });
    expect(todos.map((todo) => [todo.section, todo.text, todo.href])).toEqual([
      ["timeline", "Mốc 1990 “Ông trồng lúa” thiếu tiếng Anh ở Tiêu đề.", "/admin/hanh-trinh?sua=7&o=timeline.title.en"],
      ["timeline", "Mốc 1990 “Ông trồng lúa” thiếu tiếng Anh ở Mô tả.", "/admin/hanh-trinh?sua=7&o=timeline.description.en"],
      ["press", "Bài báo “Làng nếp” thiếu tiếng Anh ở Tiêu đề.", "/admin/bao-chi?sua=9&o=press.title.en"],
    ]);
  });

  it("lists empty contact and brand settings, and settings without English", () => {
    const todos = buildTodos({
      ...complete,
      contact: { ...FULL_CONTACT, phone: null, zalo: null, address: null, hours: { vi: "7 giờ", en: null } },
      brand: { tagline: null },
    });
    expect(todos.map((todo) => [todo.text, todo.href])).toEqual([
      ["Chưa có số điện thoại.", "/admin/cai-dat?o=contact.phone"],
      ["Chưa có số Zalo.", "/admin/cai-dat?o=contact.zalo"],
      ["Chưa có địa chỉ.", "/admin/cai-dat?o=contact.address.vi"],
      ["Giờ liên hệ chưa có tiếng Anh.", "/admin/cai-dat?o=contact.hours.en"],
      ["Chưa có khẩu hiệu.", "/admin/cai-dat?o=brand.tagline.vi"],
    ]);
    expect(todos.every((todo) => todo.section === "settings")).toBe(true);
  });

  it("skips a list that could not be loaded", () => {
    expect(buildTodos({ contact: FULL_CONTACT })).toEqual([]);
  });

  it("orders the sections: settings, stories, products, timeline, press", () => {
    const todos = buildTodos({
      products: [product({ mediaIds: [] })],
      stories: [story({ status: "DRAFT" })],
      timeline: [event({ title: { vi: "A", en: null } })],
      press: [press({ title: { vi: "B", en: null } })],
      contact: { ...FULL_CONTACT, phone: null },
      brand: FULL_BRAND,
    });
    expect(todos.map((todo) => todo.section)).toEqual(["settings", "stories", "products", "timeline", "press"]);
  });
});
