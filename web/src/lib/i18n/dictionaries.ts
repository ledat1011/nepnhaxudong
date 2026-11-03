import type { Lang } from "./langs";

type DeepStrings<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]>;
};

const vi = {
  site: {
    name: "Nếp Nhà",
    description:
      "Nếp Nhà là gạo nếp cái hoa vàng của một gia đình ở xứ Đông, trồng và chăm theo cách của nhà mình: dẻo, thơm và đậm vị quê.",
  },
  nav: {
    home: "Trang chủ",
    label: "Điều hướng chính",
    product: "Sản phẩm",
    journey: "Hành trình",
    press: "Báo chí",
    story: "Câu chuyện",
    contact: "Liên hệ",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    skipToContent: "Bỏ qua tới nội dung",
  },
  language: {
    label: "Ngôn ngữ",
    vi: "Tiếng Việt",
    en: "English",
  },
  hero: {
    zaloCta: "Liên hệ qua Zalo",
    journeyCta: "Xem hành trình",
  },
  sections: {
    product: "Sản phẩm",
    journey: "Hành trình",
    press: "Báo chí nói về Nếp Nhà",
    story: "Câu chuyện Nếp Nhà",
    contact: "Liên hệ",
  },
  product: {
    features: "Đặc điểm",
    packaging: "Quy cách đóng gói",
    dishes: "Gợi ý món",
    contactPrice: "Giá liên hệ",
  },
  contact: {
    phone: "Điện thoại",
    zalo: "Zalo",
    messenger: "Messenger",
    address: "Địa chỉ",
    viewMap: "Xem bản đồ",
    hours: "Giờ liên hệ",
  },
  footer: {
    copyright: "Bản quyền",
  },
  gallery: {
    viewLarge: "Xem ảnh lớn",
    previous: "Ảnh trước",
    next: "Ảnh sau",
    close: "Đóng",
  },
  stories: {
    readMore: "Đọc tiếp",
    viewAll: "Xem tất cả",
    backToList: "Quay lại danh sách",
    previousPage: "Trang trước",
    nextPage: "Trang sau",
    pagination: "Phân trang",
    empty: "Chưa có câu chuyện nào.",
  },
  image: {
    placeholder: "Ảnh sắp được cập nhật",
  },
  error: {
    title: "Có lỗi xảy ra",
    message: "Trang này tạm thời không tải được. Bạn hãy thử lại sau ít phút.",
    retry: "Thử lại",
    home: "Về trang chủ",
  },
  notFound: {
    title: "Không tìm thấy trang",
    message: "Trang bạn tìm không có hoặc đã được chuyển sang nơi khác.",
    home: "Về trang chủ",
  },
};

export type Dictionary = DeepStrings<typeof vi>;

const en: Dictionary = {
  site: {
    name: "Nếp Nhà",
    description:
      "Nếp Nhà is the yellow-flower sticky rice (gạo nếp cái hoa vàng) of a family from the Đông region, grown and cared for in the family's own way: soft, fragrant and full of home flavor.",
  },
  nav: {
    home: "Home",
    label: "Main navigation",
    product: "Product",
    journey: "Journey",
    press: "Press",
    story: "Stories",
    contact: "Contact",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skipToContent: "Skip to content",
  },
  language: {
    label: "Language",
    vi: "Tiếng Việt",
    en: "English",
  },
  hero: {
    zaloCta: "Contact us on Zalo",
    journeyCta: "See the journey",
  },
  sections: {
    product: "Product",
    journey: "Journey",
    press: "Nếp Nhà in the press",
    story: "Nếp Nhà stories",
    contact: "Contact",
  },
  product: {
    features: "Features",
    packaging: "Packaging",
    dishes: "Serving ideas",
    contactPrice: "Contact for price",
  },
  contact: {
    phone: "Phone",
    zalo: "Zalo",
    messenger: "Messenger",
    address: "Address",
    viewMap: "View map",
    hours: "Contact hours",
  },
  footer: {
    copyright: "Copyright",
  },
  gallery: {
    viewLarge: "View larger image",
    previous: "Previous image",
    next: "Next image",
    close: "Close",
  },
  stories: {
    readMore: "Read more",
    viewAll: "View all",
    backToList: "Back to the list",
    previousPage: "Previous page",
    nextPage: "Next page",
    pagination: "Pagination",
    empty: "There are no stories yet.",
  },
  image: {
    placeholder: "Photo coming soon",
  },
  error: {
    title: "Something went wrong",
    message:
      "This page cannot be loaded right now. Please try again in a few minutes.",
    retry: "Try again",
    home: "Back to home",
  },
  notFound: {
    title: "Page not found",
    message: "The page you are looking for does not exist or has moved.",
    home: "Back to home",
  },
};

const DICTIONARIES: Record<Lang, Dictionary> = { vi, en };

export function getDictionary(lang: Lang): Dictionary {
  return DICTIONARIES[lang];
}
