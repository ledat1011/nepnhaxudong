import { afterEach, describe, expect, it } from "vitest";
import { actionLabel, diffSnapshots, entityTypeLabel, formatVnTime } from "./audit-diff";

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
