import { describe, expect, it } from "vitest";
import { apiRest, fieldOfDetail, langOfDetail, mapApiDetail, splitDetail, withoutFields } from "./field-errors";
import { AdminApiError } from "./errors";

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

describe("splitDetail", () => {
  it("splits the sentences that the API joined with a space", () => {
    expect(splitDetail("Email không hợp lệ. Tên hiển thị quá dài.")).toEqual(["Email không hợp lệ.", "Tên hiển thị quá dài."]);
  });

  it("keeps a sentence with a number or a web address in one piece", () => {
    expect(splitDetail("Đường dẫn bài báo phải bắt đầu bằng http:// hoặc https:// và dài tối đa 2.000 ký tự.")).toHaveLength(1);
  });
});

describe("mapApiDetail", () => {
  const rules = [
    { prefix: "Email", field: "email" },
    { prefix: "Tên hiển thị", field: "displayName" },
    { prefix: "Giờ làm việc", field: "hours.vi", text: (part: string) => part.replace("Giờ làm việc", "Giờ liên hệ") },
  ];

  it("puts each joined message under its own field", () => {
    expect(mapApiDetail("Email không hợp lệ. Tên hiển thị quá dài.", rules)).toEqual({
      errors: { email: "Email không hợp lệ.", displayName: "Tên hiển thị quá dài." },
      rest: null,
    });
  });

  it("keeps the parts that name no field for the general message", () => {
    expect(mapApiDetail("Email không hợp lệ. Mật khẩu quá dài.", rules)).toEqual({
      errors: { email: "Email không hợp lệ." },
      rest: "Mật khẩu quá dài.",
    });
    expect(apiRest(new AdminApiError(400, "Email không hợp lệ. Mật khẩu quá dài."), rules)).toBe("Mật khẩu quá dài.");
    expect(apiRest(null, rules)).toBeNull();
  });

  it("can write the field name the way the form label says it", () => {
    expect(mapApiDetail("Giờ làm việc dài tối đa 500 ký tự.", rules).errors).toEqual({
      "hours.vi": "Giờ liên hệ dài tối đa 500 ký tự.",
    });
  });
});

