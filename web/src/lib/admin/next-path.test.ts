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
    ["/other"],
    ["admin"],
    [""],
  ])("falls back to the dashboard for %j", (input) => {
    expect(safeNextPath(input)).toBe(ADMIN_ROUTES.home);
  });

  it("falls back for a missing value", () => {
    expect(safeNextPath(null)).toBe(ADMIN_ROUTES.home);
    expect(safeNextPath(undefined)).toBe(ADMIN_ROUTES.home);
  });
});
