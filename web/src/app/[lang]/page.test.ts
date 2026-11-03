import { describe, expect, it } from "vitest";
import { generateMetadata } from "./page";

const params = (lang: string) => ({ params: Promise.resolve({ lang }) });

describe("home page metadata", () => {
  it("uses the same title separator as the other pages", async () => {
    expect((await generateMetadata(params("vi"))).title).toBe("Nếp Nhà | Gạo nếp cái hoa vàng");
    expect((await generateMetadata(params("en"))).title).toBe(
      "Nếp Nhà | Yellow-flower sticky rice",
    );
  });

  it("has no metadata for an unknown language", async () => {
    expect(await generateMetadata(params("fr"))).toEqual({});
  });
});
