export const ADMIN_ROUTES = {
  home: "/admin",
  login: "/admin/dang-nhap",
  changePassword: "/admin/doi-mat-khau",
  setupTotp: "/admin/bat-xac-thuc",
  products: "/admin/san-pham",
  timeline: "/admin/hanh-trinh",
  press: "/admin/bao-chi",
  stories: "/admin/cau-chuyen",
  media: "/admin/anh",
  settings: "/admin/cai-dat",
  accounts: "/admin/tai-khoan",
  history: "/admin/lich-su",
} as const;

/** The search parameter of the history screen that names the open line. */
export const HISTORY_OPEN_PARAM = "mo";

/** The history screen with one line open, for example from "Thay đổi gần đây" on Tổng quan. */
export function historyEntryHref(id: number): string {
  return `${ADMIN_ROUTES.history}?${HISTORY_OPEN_PARAM}=${id}`;
}
