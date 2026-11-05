import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { HomeData } from "./types";
import { createMockClient } from "./mock-client";
import { buildHomeNav } from "./home-nav";

const dict = getDictionary("vi");

async function homeVi(): Promise<HomeData> {
  return createMockClient().getHome("vi");
}

function ids(nav: Array<{ id: string }>): string[] {
  return nav.map((item) => item.id);
}

describe("buildHomeNav", () => {
  it("lists all six sections in page order with their labels", async () => {
    const nav = buildHomeNav(await homeVi(), dict);
    expect(nav).toEqual([
      { id: "san-pham", label: dict.nav.product },
      { id: "tu-hat-lua", label: dict.nav.riceStory },
      { id: "hanh-trinh", label: dict.nav.journey },
      { id: "bao-chi", label: dict.nav.press },
      { id: "cau-chuyen", label: dict.nav.story },
      { id: "lien-he", label: dict.nav.contact },
    ]);
  });

  it("drops the journey and press sections when they are empty", async () => {
    const home = { ...(await homeVi()), timeline: [], press: [] };
    expect(ids(buildHomeNav(home, dict))).toEqual(["san-pham", "tu-hat-lua", "cau-chuyen", "lien-he"]);
  });

  it("drops the product section when there are no products", async () => {
    const home = { ...(await homeVi()), products: [] };
    expect(ids(buildHomeNav(home, dict))).not.toContain("san-pham");
  });

  it("drops the stories section when there are no stories", async () => {
    const home = { ...(await homeVi()), stories: [] };
    expect(ids(buildHomeNav(home, dict))).not.toContain("cau-chuyen");
  });

  it("always keeps the rice story and the contact section", async () => {
    const home = { ...(await homeVi()), products: [], timeline: [], press: [], stories: [] };
    expect(ids(buildHomeNav(home, dict))).toEqual(["tu-hat-lua", "lien-he"]);
  });
});
