import { afterEach, describe, expect, it } from "vitest";
import { actionLabel, diffSnapshots, entityTypeLabel, entryMeta, formatVnTime } from "./audit-diff";

describe("diffSnapshots", () => {
  it("names the Hiện trên web switch of a product and says Có or Không", () => {
    const rows = diffSnapshots({ visible: false, name: { vi: "A" } }, { visible: true, name: { vi: "A" } }, "product");
    expect(rows).toEqual([{ path: "Hiện trên web", before: "Không", after: "Có" }]);
    expect(diffSnapshots(null, { visible: false }, "product")).toEqual([{ path: "Hiện trên web", before: null, after: "Không" }]);
  });

  it("leaves a field named visible of another kind as it is", () => {
    expect(diffSnapshots({ visible: false }, { visible: true }, "story")).toEqual([
      { path: "visible", before: "false", after: "true" },
    ]);
    expect(diffSnapshots({ visible: false }, { visible: true })).toEqual([{ path: "visible", before: "false", after: "true" }]);
  });

  it("returns only the paths whose value changed", () => {
    const rows = diffSnapshots({ name: { vi: "A", en: null } }, { name: { vi: "B", en: null } });
    expect(rows).toEqual([{ path: "name.vi", before: "A", after: "B" }]);
  });

  it("shows every field of the after side with before null for a create line", () => {
    const rows = diffSnapshots(null, { id: 3, name: { vi: "A", en: null } });
    expect(rows).toEqual([
      { path: "id", before: null, after: "3" },
      { path: "name.en", before: null, after: "null" },
      { path: "name.vi", before: null, after: "A" },
    ]);
  });

  it("shows every field of the before side with after null for a delete line", () => {
    expect(diffSnapshots({ a: true }, null)).toEqual([{ path: "a", before: "true", after: null }]);
  });

  it("cuts a string of 300 characters to 201 characters with an ellipsis", () => {
    const [row] = diffSnapshots({ t: "a".repeat(300) }, { t: "b" });
    expect(row.before).toHaveLength(201);
    expect(row.before?.endsWith("…")).toBe(true);
  });

  it("compares the full text, so a change after the 200th character is still found", () => {
    const rows = diffSnapshots({ t: "a".repeat(250) + "x" }, { t: "a".repeat(250) + "y" });
    expect(rows).toHaveLength(1);
  });

  it("does not leave half of a surrogate pair at the cut", () => {
    const text = "a".repeat(199) + "😀😀";
    const [row] = diffSnapshots({ t: text }, { t: "b" });
    expect(row.before).toBe("a".repeat(199) + "…");
  });

  it("flattens arrays with index paths and sorts the paths with numbers in order", () => {
    const before = { packagings: [{ weightGrams: 500 }, { weightGrams: 1000 }] };
    const after = { packagings: [{ weightGrams: 500 }, { weightGrams: 2000 }], mediaIds: [1, 2] };
    expect(diffSnapshots(before, after)).toEqual([
      { path: "mediaIds.0", before: null, after: "1" },
      { path: "mediaIds.1", before: null, after: "2" },
      { path: "packagings.1.weightGrams", before: "1000", after: "2000" },
    ]);
    const many = diffSnapshots({ l: [100] }, { l: Array.from({ length: 12 }, (_, i) => i) });
    expect(many.map((r) => r.path).slice(0, 4)).toEqual(["l.0", "l.1", "l.2", "l.3"]);
    expect(many.map((r) => r.path)[10]).toBe("l.10");
  });

  it("tells a path that exists only on one side from a null value", () => {
    const rows = diffSnapshots({ a: null }, { b: null });
    expect(rows).toEqual([
      { path: "a", before: "null", after: null },
      { path: "b", before: null, after: "null" },
    ]);
  });

  it("shows numbers and booleans as text and an empty object or array as a value", () => {
    const rows = diffSnapshots({ n: 1, f: false, o: {}, a: [] }, { n: 2, f: true, o: { k: 1 }, a: [1] });
    expect(rows.map((r) => [r.path, r.before, r.after])).toEqual([
      ["a", "[]", null],
      ["a.0", null, "1"],
      ["f", "false", "true"],
      ["n", "1", "2"],
      ["o", "{}", null],
      ["o.k", null, "1"],
    ]);
  });

  it("handles a snapshot that is not an object", () => {
    expect(diffSnapshots("x", "y")).toEqual([{ path: "(giá trị)", before: "x", after: "y" }]);
    expect(diffSnapshots(undefined, undefined)).toEqual([]);
  });

  it("keeps a key called __proto__ as plain data", () => {
    const evil = JSON.parse('{"__proto__": {"polluted": 1}}');
    const rows = diffSnapshots(null, evil);
    expect(rows).toEqual([{ path: "__proto__.polluted", before: null, after: "1" }]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("does not crash on a very deep object", () => {
    let deep: unknown = "end";
    for (let i = 0; i < 20000; i += 1) deep = { k: deep };
    const rows = diffSnapshots(deep, null);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(10);
    expect(rows[0].before!.length).toBeLessThanOrEqual(201);
  });

  it("does not crash on a very large object and says that it shows a part", () => {
    const big: Record<string, number> = {};
    for (let i = 0; i < 50000; i += 1) big[`k${i}`] = i;
    const rows = diffSnapshots(null, big);
    expect(rows.length).toBeLessThan(2100);
    expect(rows.some((r) => r.path === "…")).toBe(true);
  });

  it("keeps markup as plain text", () => {
    const [row] = diffSnapshots({ t: "<img src=x onerror=alert(1)>" }, { t: "ok" });
    expect(row.before).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("diffSnapshots field names", () => {
  const names = (rows: { path: string }[]) => rows.map((row) => row.path);

  it("names every field of a product in Vietnamese, with the language and the place in a list", () => {
    const before = {
      id: 4,
      sortOrder: 1,
      showPrice: false,
      name: { vi: "Gạo", en: null },
      features: { vi: ["Dẻo"], en: [] },
      packagings: [{ weightGrams: 500, priceVnd: 50000, sortOrder: 0 }],
      mediaIds: [],
    };
    const after = {
      id: 4,
      sortOrder: 2,
      showPrice: true,
      name: { vi: "Gạo nếp", en: "Rice" },
      features: { vi: ["Dẻo", "Thơm"], en: ["Soft"] },
      packagings: [
        { weightGrams: 500, priceVnd: 50000, sortOrder: 0 },
        { weightGrams: 2000, priceVnd: 150000, sortOrder: 1 },
      ],
      mediaIds: [7],
    };
    // An empty list on one side and a filled one on the other shows only the filled items.
    expect(diffSnapshots(before, after, "product")).toEqual([
      { path: "Đặc điểm 1 (tiếng Anh)", before: null, after: "Soft" },
      { path: "Đặc điểm 2 (tiếng Việt)", before: null, after: "Thơm" },
      { path: "Ảnh 1 (mã ảnh)", before: null, after: "7" },
      { path: "Tên sản phẩm (tiếng Anh)", before: null, after: "Rice" },
      { path: "Tên sản phẩm (tiếng Việt)", before: "Gạo", after: "Gạo nếp" },
      { path: "Quy cách 2: giá", before: null, after: "150.000 đ" },
      { path: "Quy cách 2: thứ tự", before: null, after: "1" },
      { path: "Quy cách 2: khối lượng", before: null, after: "2.000 g" },
      { path: "Hiện giá", before: "Không", after: "Có" },
      { path: "Thứ tự", before: "1", after: "2" },
    ]);
  });

  it("names the fields of the contact settings, as the settings screen does", () => {
    const rows = diffSnapshots(
      { id: 1, key: "contact", value: { zalo: "0912", address: { vi: "Hải Dương", en: null } } },
      { id: 1, key: "contact", value: { zalo: "0913", address: { vi: "Hải Dương", en: "Hai Duong" } } },
      "site_setting",
    );
    expect(rows).toEqual([
      { path: "Địa chỉ (tiếng Anh)", before: null, after: "Hai Duong" },
      { path: "Số Zalo", before: "0912", after: "0913" },
    ]);
    expect(diffSnapshots(null, { key: "social" }, "site_setting")).toEqual([
      { path: "Loại cài đặt", before: null, after: "Mạng xã hội" },
    ]);
  });

  it("shows the state of a story, its dates and its texts in words", () => {
    const rows = diffSnapshots(
      { status: "DRAFT", publishedAt: null, bodyHtml: { vi: "<p>A</p>", en: null } },
      { status: "PUBLISHED", publishedAt: "2026-11-04T01:00:00Z", bodyHtml: { vi: "<p>B</p>", en: null } },
      "story",
    );
    expect(rows).toEqual([
      { path: "Nội dung (tiếng Việt)", before: "<p>A</p>", after: "<p>B</p>" },
      { path: "Thời điểm đăng", before: null, after: "08:00 04/11/2026" },
      { path: "Trạng thái", before: "Nháp", after: "Đã đăng" },
    ]);
  });

  it("names the fields of a timeline event, a press mention, an image and an account", () => {
    expect(names(diffSnapshots({ year: 1990, mediaId: 1 }, { year: 1991, mediaId: 2 }, "timeline_event"))).toEqual([
      "Ảnh (mã ảnh)",
      "Năm",
    ]);
    const press = diffSnapshots(
      { sourceName: "A", publishedOn: "2024-05-01" },
      { sourceName: "B", publishedOn: "2024-06-02" },
      "press_mention",
    );
    expect(press).toEqual([
      { path: "Ngày đăng", before: "01/05/2024", after: "02/06/2024" },
      { path: "Tên báo", before: "A", after: "B" },
    ]);
    expect(names(diffSnapshots({ altVi: "a", altEn: "b" }, { altVi: "c", altEn: "d" }, "media"))).toEqual([
      "Mô tả ảnh (tiếng Anh)",
      "Mô tả ảnh (tiếng Việt)",
    ]);
    const account = diffSnapshots({ role: "MEMBER", totpEnabled: false }, { role: "OWNER", totpEnabled: true }, "app_user");
    expect(account).toEqual([
      { path: "Vai trò", before: "Người nhà", after: "Chủ" },
      { path: "Xác thực 2 lớp", before: "Tắt", after: "Bật" },
    ]);
  });

  it("shows an empty value as empty and leaves out a field that is empty on both sides", () => {
    // A create line: the English name was never typed. There is nothing to show for it.
    expect(diffSnapshots(null, { name: { vi: "Gạo", en: null } }, "product")).toEqual([
      { path: "Tên sản phẩm (tiếng Việt)", before: null, after: "Gạo" },
    ]);
    expect(diffSnapshots({ name: { vi: "Gạo", en: "Rice" } }, { name: { vi: "Gạo", en: null } }, "product")).toEqual([
      { path: "Tên sản phẩm (tiếng Anh)", before: "Rice", after: null },
    ]);
  });

  it("keeps the raw name of a field it does not know", () => {
    expect(diffSnapshots({ extra: 1 }, { extra: 2 }, "product")).toEqual([{ path: "extra", before: "1", after: "2" }]);
  });
});

describe("entryMeta", () => {
  const line = {
    id: 1,
    userDisplayName: "Mẹ" as string | null,
    entityType: "product",
    entityId: 1,
    action: "UPDATE" as const,
    createdAt: "2026-11-04T01:00:00Z",
    label: "Gạo",
    restorable: true,
  };

  it("joins time, user, kind and action", () => {
    expect(entryMeta(line)).toBe("08:00 04/11/2026 · Mẹ · Sản phẩm · Sửa");
  });

  it("says the account was deleted when the line has no user name", () => {
    expect(entryMeta({ ...line, userDisplayName: null })).toBe("08:00 04/11/2026 · Tài khoản đã xóa · Sản phẩm · Sửa");
    expect(entryMeta({ ...line, userDisplayName: "  " })).toBe("08:00 04/11/2026 · Tài khoản đã xóa · Sản phẩm · Sửa");
  });
});

describe("labels and time", () => {
  const machineZone = process.env.TZ;
  afterEach(() => {
    if (machineZone === undefined) delete process.env.TZ;
    else process.env.TZ = machineZone;
  });

  it("names the content kinds and actions in Vietnamese", () => {
    expect(entityTypeLabel("product")).toBe("Sản phẩm");
    expect(entityTypeLabel("timeline_event")).toBe("Hành trình");
    expect(entityTypeLabel("press_mention")).toBe("Báo chí");
    expect(entityTypeLabel("story")).toBe("Câu chuyện");
    expect(entityTypeLabel("media")).toBe("Ảnh");
    expect(entityTypeLabel("site_setting")).toBe("Cài đặt");
    expect(entityTypeLabel("app_user")).toBe("Tài khoản");
    expect(entityTypeLabel("other")).toBe("other");
    expect(actionLabel("CREATE")).toBe("Tạo");
    expect(actionLabel("UPDATE")).toBe("Sửa");
    expect(actionLabel("DELETE")).toBe("Xóa");
    expect(actionLabel("RESTORE")).toBe("Khôi phục");
  });

  it("shows time in Vietnam whatever the machine time zone is", () => {
    // Changing TZ at run time changes the default zone of Date and Intl in Node.
    process.env.TZ = "America/Los_Angeles";
    expect(new Date("2026-11-04T01:00:00Z").getHours()).toBe(17);
    expect(formatVnTime("2026-11-04T01:00:00Z")).toBe("08:00 04/11/2026");
    expect(formatVnTime("2026-11-04T17:30:00Z")).toBe("00:30 05/11/2026");
    expect(formatVnTime("not a date")).toBe("not a date");
  });
});
