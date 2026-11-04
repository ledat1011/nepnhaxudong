import { describe, expect, it } from "vitest";
import { ADMIN_ROUTES } from "./routes";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/anh", "/admin/anh"],
    ["/admin/cau-chuyen/5?tab=1", "/admin/cau-chuyen/5?tab=1"],
  ])("accepts %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    ["https://evil.example"],
    ["//evil.example"],
    ["/admin@evil"],
    ["/adminx"],
    ["/admin/\\evil.example"],
    ["\\\\evil.example"],
    ["/admin/../..//evil"],
    ["/admin/%2e%2e/x"],
    ["/admin/a/../b"],
    [`/admin/${"a".repeat(2000)}`],
    ["/other"],
    ["admin"],
    [""],
  ])("falls back to the dashboard for %j", (input) => {
    expect(safeNextPath(input)).toBe(ADMIN_ROUTES.home);
  });

  it("accepts exactly 2000 characters and a name that only contains dots", () => {
    const longest = `/admin/${"a".repeat(1993)}`;
    expect(longest).toHaveLength(2000);
    expect(safeNextPath(longest)).toBe(longest);
    expect(safeNextPath("/admin/a..b")).toBe("/admin/a..b");
  });

  it("falls back for a missing value", () => {
    expect(safeNextPath(null)).toBe(ADMIN_ROUTES.home);
    expect(safeNextPath(undefined)).toBe(ADMIN_ROUTES.home);
  });
});
