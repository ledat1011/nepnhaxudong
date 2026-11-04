import { describe, expect, it } from "vitest";
import { fieldOfDetail, langOfDetail, withoutFields } from "./field-errors";

describe("fieldOfDetail", () => {
  const rules = [
    { prefix: "Tên sản phẩm", field: (detail: string) => `name.${langOfDetail(detail)}` },
    { prefix: "Đặc điểm", field: "features" },
  ];

  it("finds the field whose label starts the API message", () => {
    expect(fieldOfDetail("Đặc điểm (tiếng Việt) cần có ít nhất một mục.", rules)).toBe("features");
  });

  it("lets a rule choose the box of a language", () => {
    expect(fieldOfDetail("Tên sản phẩm (tiếng Việt) không được để trống.", rules)).toBe("name.vi");
    expect(fieldOfDetail("Tên sản phẩm (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.", rules)).toBe(
      "name.en",
    );
  });

  it("returns null for a message that names no known field", () => {
    expect(fieldOfDetail("Đã có lỗi xảy ra. Hãy thử lại sau.", rules)).toBeNull();
  });
});

describe("langOfDetail", () => {
  it("reads the language in brackets, and uses the fallback without one", () => {
    expect(langOfDetail("Địa chỉ (tiếng Việt) không được để trống khi đã có nội dung tiếng Anh.")).toBe("vi");
    expect(langOfDetail("Tiêu đề mốc (tiếng Anh) không được để trống.")).toBe("en");
    expect(langOfDetail("Địa chỉ dài tối đa 500 ký tự.", "en")).toBe("en");
    expect(langOfDetail("Địa chỉ dài tối đa 500 ký tự.")).toBe("vi");
  });
});

describe("withoutFields", () => {
  it("removes the given fields and keeps the same object when none is there", () => {
    const errors = { a: "x", b: "y" };
    expect(withoutFields(errors, ["a"])).toEqual({ b: "y" });
    expect(withoutFields(errors, ["c"])).toBe(errors);
  });

  it("removes every field that starts with a prefix ending in a dot", () => {
    expect(withoutFields({ "name.vi": "x", "name.en": "y", year: "z" }, ["name."])).toEqual({ year: "z" });
  });
});
