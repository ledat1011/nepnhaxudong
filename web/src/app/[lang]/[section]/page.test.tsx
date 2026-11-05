import { isValidElement, Suspense } from "react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoryList } from "@/components/story/StoryList";
import { StoryListSkeleton } from "@/components/story/StoryListSkeleton";
import type { HomeData, StorySummary } from "@/lib/content/types";
import StoryListPage from "./page";

const home: HomeData = {
  lang: "vi",
  brand: { tagline: "t" },
  products: [],
  timeline: [],
  press: [],
  stories: [],
  contact: { phone: null, zalo: null, messenger: null, address: null, mapUrl: null, hours: null },
  social: { facebook: null, youtube: null, tiktok: null },
};

let stories: StorySummary[] = [];

// The error `notFound()` throws; Next answers it with the 404 page and status.
const NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404";

vi.mock("@/lib/content/client", () => ({
  getContentClient: () => ({
    getHome: async () => home,
    getStory: async () => null,
    getStories: async () => stories,
  }),
}));

/** Every element in the returned tree, without rendering any component. */
function elements(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  const props = node.props as { children?: ReactNode };
  return [node, ...elements(props.children)];
}

function open(page?: string) {
  return StoryListPage({
    params: Promise.resolve({ lang: "vi", section: "cau-chuyen" }),
    searchParams: Promise.resolve(page === undefined ? {} : { page }),
  });
}

describe("StoryListPage", () => {
  beforeEach(() => {
    stories = [];
  });

  it("shows the story skeleton while the list of the first page loads", async () => {
    const tree = await open();
    const boundary = elements(tree).find((element) => element.type === Suspense);
    expect(boundary).toBeDefined();
    const props = boundary?.props as { fallback: ReactElement; children: ReactElement };
    expect(props.fallback.type).toBe(StoryListSkeleton);
    expect(props.children.type).toBe(StoryList);
  });

  it("answers 404 for a page that is not a number", async () => {
    await expect(open("abc")).rejects.toMatchObject({ digest: NOT_FOUND });
  });

  it("answers 404 for a later page with no stories, before the page streams", async () => {
    await expect(open("3")).rejects.toMatchObject({ digest: NOT_FOUND });
  });
});
