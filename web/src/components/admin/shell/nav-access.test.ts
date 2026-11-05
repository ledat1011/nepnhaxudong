import { describe, expect, it } from "vitest";
import { moreItemsFor, screenTitleFor } from "./nav-access";
import { MORE_ITEMS } from "./nav-items";

describe("menu by role", () => {
  it("gives an owner the accounts screen as Tài khoản", () => {
    expect(moreItemsFor("OWNER")).toEqual(MORE_ITEMS);
    expect(screenTitleFor("/admin/tai-khoan", "OWNER")).toBe("Tài khoản");
  });

  it("names the same screen Bảo mật for a member, who sees only the own sign-in settings there", () => {
    const items = moreItemsFor("MEMBER");
    expect(items.map((item) => item.label)).not.toContain("Tài khoản");
    const security = items.find((item) => item.href === "/admin/tai-khoan");
    expect(security?.label).toBe("Bảo mật");
    expect(screenTitleFor("/admin/tai-khoan", "MEMBER")).toBe("Bảo mật");
  });

  it("keeps every other item and title", () => {
    const member = moreItemsFor("MEMBER").filter((item) => item.href !== "/admin/tai-khoan");
    expect(member).toEqual(MORE_ITEMS.filter((item) => item.href !== "/admin/tai-khoan"));
    expect(screenTitleFor("/admin/anh", "MEMBER")).toBe("Ảnh");
  });

  it("leaves the menu as it is while the role is not known", () => {
    expect(moreItemsFor(undefined)).toEqual(MORE_ITEMS);
  });
});
