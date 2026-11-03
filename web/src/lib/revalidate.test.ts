import { describe, expect, it } from "vitest";
import { isValidSecret, parseRevalidateTags } from "./revalidate";

describe("isValidSecret", () => {
  it("accepts an equal secret", () => {
    expect(isValidSecret("a", "a")).toBe(true);
    expect(isValidSecret("long-secret-value", "long-secret-value")).toBe(true);
  });

  it("rejects a different secret", () => {
    expect(isValidSecret("a", "b")).toBe(false);
    expect(isValidSecret("a", "ab")).toBe(false);
  });

  it("rejects when the server has no secret", () => {
    expect(isValidSecret("a", undefined)).toBe(false);
    expect(isValidSecret("", "")).toBe(false);
    expect(isValidSecret(null, "")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isValidSecret(null, "a")).toBe(false);
  });
});

describe("parseRevalidateTags", () => {
  it("returns the valid tags without duplicates", () => {
    expect(
      parseRevalidateTags({ tags: ["home", "story:mua-gat", "home"] }),
    ).toEqual(["home", "story:mua-gat"]);
  });

  it("accepts stories and a slug of 80 characters", () => {
    const slug = "a".repeat(80);
    expect(parseRevalidateTags({ tags: ["stories", `story:${slug}`] })).toEqual(
      ["stories", `story:${slug}`],
    );
  });

  it("rejects an empty list and unknown tags", () => {
    expect(parseRevalidateTags({ tags: [] })).toBeNull();
    expect(parseRevalidateTags({ tags: ["admin"] })).toBeNull();
    expect(parseRevalidateTags({ tags: ["home", "admin"] })).toBeNull();
  });

  it("rejects bad slugs", () => {
    expect(parseRevalidateTags({ tags: ["story:Có Dấu"] })).toBeNull();
    expect(parseRevalidateTags({ tags: ["story:UPPER"] })).toBeNull();
    expect(parseRevalidateTags({ tags: ["story:"] })).toBeNull();
    expect(
      parseRevalidateTags({ tags: [`story:${"a".repeat(81)}`] }),
    ).toBeNull();
  });

  it("rejects more than 50 tags and keeps exactly 50", () => {
    const tags = (n: number) =>
      Array.from({ length: n }, (_, i) => `story:s-${i}`);
    expect(parseRevalidateTags({ tags: tags(50) })).toHaveLength(50);
    expect(parseRevalidateTags({ tags: tags(51) })).toBeNull();
  });

  it("rejects bodies of the wrong shape", () => {
    expect(parseRevalidateTags({ tags: "home" })).toBeNull();
    expect(parseRevalidateTags({ tags: [1] })).toBeNull();
    expect(parseRevalidateTags({})).toBeNull();
    expect(parseRevalidateTags(null)).toBeNull();
    expect(parseRevalidateTags("abc")).toBeNull();
    expect(parseRevalidateTags(["home"])).toBeNull();
  });
});
