import type { Lang } from "./langs";

type DeepStrings<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]>;
};

const vi = {
  site: {
    name: "Nếp Nhà",
    tagline: "Gạo nếp cái hoa vàng",
    description:
      "Nếp Nhà là gạo nếp cái hoa vàng của một gia đình ở xứ Đông, trồng và chăm theo cách của nhà mình: dẻo, thơm và đậm vị quê.",
    ogImageAlt: "Linh vật Nếp Nhà đứng bên cánh đồng lúa nếp",
  },
  nav: {
    label: "Điều hướng chính",
    product: "Sản phẩm",
    riceStory: "Quy trình",
    journey: "Hành trình",
    press: "Báo chí",
    story: "Câu chuyện",
    contact: "Liên hệ",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    skipToContent: "Bỏ qua tới nội dung",
  },
  language: {
    vi: "Tiếng Việt",
    en: "English",
  },
  hero: {
    zaloCta: "Liên hệ qua Zalo",
    riceStoryCta: "Chuyện hạt nếp",
  },
  motion: {
    pause: "Tạm dừng chuyển động",
  },
  sections: {
    product: "Sản phẩm",
    journey: "Hành trình",
    press: "Báo chí nói về Nếp Nhà",
    story: "Câu chuyện Nếp Nhà",
    contact: "Liên hệ",
  },
  story: {
    title: "Từ hạt lúa tới người dùng",
    skip: "Bỏ qua câu chuyện",
    step: "Bước",
    zaloCta: "Nhắn Zalo cho nhà",
    cayMaTitle: "Cấy mạ",
    cayMaText: "Cấy từng khóm mạ nếp cái hoa vàng xuống ruộng nước.",
    nangMuaGioTitle: "Nắng, mưa, gió",
    nangMuaGioText: "Lúa lớn lên qua nắng, mưa và gió của xứ Đông, từ xanh mạ đến vàng óng.",
    gatTitle: "Gặt lúa",
    gatText: "Máy gặt cắt lúa, tách hạt, rồi đổ thóc vào từng bao.",
    sayTitle: "Sấy thóc tại nhà",
    sayText:
      "Quạt thổi hơi nóng từ lò than vào gầm, hơi nóng đi lên qua lưới sắt và làm khô lớp thóc.",
    xayXatTitle: "Xay xát",
    xayXatText: "Cho thóc vào máy; vỏ trấu bay ra, hạt gạo trắng chảy xuống.",
    dongGoiTitle: "Đóng gói",
    dongGoiText: "Hút chân không từng túi 2 kg cho gạo giữ khô và thơm.",
    denTayKhachTitle: "Đến tay khách",
    denTayKhachText:
      "Xe của nhà phân phối chở gạo tới siêu thị; khách cũng tới tận nhà lấy gạo, làm quà.",
    mamComTitle: "Mâm cơm",
    mamComText: "Xôi, bánh chưng, chè, rượu nếp: nếp nhà lên mâm cơm của mọi nhà.",
  },
  product: {
    features: "Đặc điểm",
    packaging: "Quy cách đóng gói",
    dishes: "Gợi ý món",
    contactPrice: "Giá liên hệ",
  },
  bag: {
    note1: "Túi trong: nhìn rõ từng hạt gạo",
    note2: "Hút chân không: gạo giữ khô và thơm lâu",
    note3: "Túi gọn: dễ cất, dễ làm quà",
  },
  contact: {
    phone: "Điện thoại",
    zalo: "Zalo",
    messenger: "Messenger",
    address: "Địa chỉ",
    viewMap: "Xem bản đồ",
    hours: "Giờ liên hệ",
  },
  zalo: {
    title: "Nhắn Nếp Nhà qua Zalo",
    scan: "Quét mã này bằng ứng dụng Zalo hoặc camera điện thoại để mở cuộc trò chuyện.",
    phoneHint: "Mở ứng dụng Zalo để nhắn tin, hoặc chép số để tìm Nếp Nhà trong Zalo.",
    qrAlt: "Mã QR mở cuộc trò chuyện Zalo với Nếp Nhà",
    qrLoading: "Đang tạo mã QR…",
    qrError: "Không tạo được mã QR. Bạn hãy bấm Mở Zalo.",
    number: "Số Zalo",
    copy: "Sao chép số",
    copied: "Đã chép số.",
    copyFailed: "Không chép được. Bạn hãy tự chép số ở trên.",
    open: "Mở Zalo",
    newTab: "(mở trong tab mới)",
    close: "Đóng",
  },
  footer: {
    copyright: "Bản quyền",
  },
  gallery: {
    viewLarge: "Xem ảnh lớn",
    previous: "Ảnh trước",
    next: "Ảnh sau",
    close: "Đóng",
    bag: "Hình túi gạo",
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
  loading: {
    page: "Đang tải trang…",
    stories: "Đang tải các câu chuyện…",
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
    tagline: "Yellow-flower sticky rice",
    description:
      "Nếp Nhà is yellow-flower sticky rice from a family in the xứ Đông region of northern Vietnam, grown their own way: soft, fragrant and full of country flavour.",
    ogImageAlt: "The Nếp Nhà mascot beside a sticky rice field",
  },
  nav: {
    label: "Main navigation",
    product: "Product",
    riceStory: "Process",
    journey: "Journey",
    press: "Press",
    story: "Stories",
    contact: "Contact",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skipToContent: "Skip to content",
  },
  language: {
    vi: "Tiếng Việt",
    en: "English",
  },
  hero: {
    zaloCta: "Contact us on Zalo",
    riceStoryCta: "A grain's story",
  },
  motion: {
    pause: "Pause motion",
  },
  sections: {
    product: "Product",
    journey: "Journey",
    press: "Nếp Nhà in the press",
    story: "Nếp Nhà stories",
    contact: "Contact",
  },
  story: {
    title: "From the rice seed to your table",
    skip: "Skip the story",
    step: "Step",
    zaloCta: "Message us on Zalo",
    cayMaTitle: "Planting seedlings",
    cayMaText:
      "Bunch by bunch, the yellow-flower sticky rice seedlings go into the flooded field.",
    nangMuaGioTitle: "Sun, rain and wind",
    nangMuaGioText:
      "The rice grows through the sun, rain and wind of the xứ Đông region, from green seedling to golden grain.",
    gatTitle: "Harvest",
    gatText: "The harvester cuts the rice, threshes it and fills one sack after another.",
    sayTitle: "Drying the rice at home",
    sayText:
      "A fan blows hot air from the coal stove under the floor. The air rises through the iron mesh and dries the rice.",
    xayXatTitle: "Milling",
    xayXatText:
      "The rice goes into the machine. The husks fly out and white grains pour down.",
    dongGoiTitle: "Packing",
    dongGoiText: "Each 2 kg bag is vacuum-sealed so the rice stays dry and fragrant.",
    denTayKhachTitle: "Reaching the customer",
    denTayKhachText:
      "The distributor's truck takes the rice to the supermarket. Customers also come to our home to pick up rice, as gifts.",
    mamComTitle: "The meal tray",
    mamComText:
      "Sticky rice, bánh chưng, sweet soup and rice wine: our rice goes onto every family's tray.",
  },
  product: {
    features: "Features",
    packaging: "Packaging",
    dishes: "Serving ideas",
    contactPrice: "Contact for price",
  },
  bag: {
    note1: "Clear bag: you can see every grain",
    note2: "Vacuum packed: the rice stays dry and fragrant for longer",
    note3: "Compact bag: easy to store and to give",
  },
  contact: {
    phone: "Phone",
    zalo: "Zalo",
    messenger: "Messenger",
    address: "Address",
    viewMap: "View map",
    hours: "Contact hours",
  },
  zalo: {
    title: "Message Nếp Nhà on Zalo",
    scan: "Scan this code with the Zalo app or your phone camera to open the chat.",
    phoneHint: "Open the Zalo app to send a message, or copy the number to find Nếp Nhà in Zalo.",
    qrAlt: "QR code that opens a Zalo chat with Nếp Nhà",
    qrLoading: "Making the QR code…",
    qrError: "The QR code could not be made. Please use Open Zalo.",
    number: "Zalo number",
    copy: "Copy number",
    copied: "Number copied.",
    copyFailed: "Could not copy. Please copy the number above by hand.",
    open: "Open Zalo",
    newTab: "(opens in a new tab)",
    close: "Close",
  },
  footer: {
    copyright: "Copyright",
  },
  gallery: {
    viewLarge: "View larger image",
    previous: "Previous image",
    next: "Next image",
    close: "Close",
    bag: "Drawing of the rice bag",
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
  loading: {
    page: "Loading the page…",
    stories: "Loading the stories…",
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
