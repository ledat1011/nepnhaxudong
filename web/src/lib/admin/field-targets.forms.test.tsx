import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PressMentionAdminDto, ProductAdminDto, StoryAdminDto, TimelineEventAdminDto } from "./types";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: vi.fn() }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import SettingsPage from "@/app/admin/(app)/cai-dat/page";
import { PressForm } from "@/components/admin/press/PressForm";
import { ProductForm } from "@/components/admin/product/ProductForm";
import { StoryForm } from "@/components/admin/story/StoryForm";
import { TimelineEventForm } from "@/components/admin/timeline/TimelineEventForm";
import { FIELD_TARGETS, closedTab, findField, type FieldKey } from "./field-targets";
import { NavGuardProvider } from "./nav-guard";

const missing = { vi: "Có chữ", en: null };

const product: ProductAdminDto = {
  id: 3,
  sortOrder: 1,
  showPrice: true,
  name: missing,
  description: missing,
  features: { vi: ["Thơm"], en: [] },
  cookingTips: missing,
  packagings: [],
  mediaIds: [],
  missingEn: true,
};

const story: StoryAdminDto = {
  id: 5,
  status: "DRAFT",
  publishedAt: null,
  coverMediaId: null,
  slug: { vi: "mua-gat", en: null },
  title: missing,
  excerpt: missing,
  bodyHtml: { vi: "<p>Lúa</p>", en: null },
  missingEn: true,
};

const event: TimelineEventAdminDto = { id: 7, year: 1990, sortOrder: 1, title: missing, description: missing, mediaId: null, missingEn: true };

const press: PressMentionAdminDto = {
  id: 9,
  url: "https://baochi.example/1",
  sourceName: "Báo",
  publishedOn: null,
  title: missing,
  mediaId: null,
  sortOrder: 1,
  missingEn: true,
};

/** Which screen each group of keys lives on. Every key of FIELD_TARGETS must be in exactly one group. */
const SCREENS: { name: string; keys: FieldKey[]; ui: () => ReactNode }[] = [
  {
    name: "product form",
    keys: ["product.name.en", "product.description.en", "product.features.en", "product.cookingTips.en", "product.images"],
    ui: () => <ProductForm initial={product} />,
  },
  {
    name: "story form",
    keys: ["story.publish", "story.cover", "story.title.en", "story.excerpt.en", "story.body.en"],
    ui: () => <StoryForm initial={story} />,
  },
  {
    name: "timeline dialog",
    keys: ["timeline.title.en", "timeline.description.en"],
    ui: () => <TimelineEventForm initial={event} onClose={() => {}} onChanged={() => {}} />,
  },
  { name: "press dialog", keys: ["press.title.en"], ui: () => <PressForm initial={press} onClose={() => {}} onChanged={() => {}} /> },
  {
    name: "settings page",
    keys: [
      "contact.phone",
      "contact.zalo",
      "contact.address.vi",
      "contact.address.en",
      "contact.hours.vi",
      "contact.hours.en",
      "brand.tagline.vi",
      "brand.tagline.en",
    ],
    ui: () => <SettingsPage />,
  },
];

beforeEach(() => {
  adminFetch.mockReset();
  adminFetch.mockImplementation(async (path: string) => {
    if (path === "/admin/settings/contact") return { phone: null, zalo: null, messenger: null, address: missing, mapUrl: null, hours: missing };
    if (path === "/admin/settings/brand") return { tagline: missing };
    if (path === "/admin/settings/social") return { facebook: null, youtube: null, tiktok: null };
    return [];
  });
});

/** Opens the target's tab like FieldFocus does (a Radix tab opens when it gets focus), then finds the field. */
async function locate(key: FieldKey): Promise<HTMLElement | null> {
  const target = FIELD_TARGETS[key];
  await waitFor(() => expect(closedTab(document.body, target)).not.toBe("missing"));
  const tab = closedTab(document.body, target);
  if (tab !== null && tab !== "missing") act(() => tab.focus());
  let field: HTMLElement | null = null;
  await waitFor(() => {
    field = findField(document.body, target);
    expect(field).not.toBeNull();
  });
  return field;
}

describe("FIELD_TARGETS on the real forms", () => {
  it("lists every key on one screen", () => {
    const listed = SCREENS.flatMap((screen) => screen.keys).sort();
    expect(listed).toEqual(Object.keys(FIELD_TARGETS).sort());
  });

  for (const { name, keys, ui } of SCREENS) {
    for (const key of keys) {
      it(`finds ${key} on the ${name}`, async () => {
        render(<NavGuardProvider>{ui()}</NavGuardProvider>);
        const field = await locate(key);
        expect(field).toBeInstanceOf(HTMLElement);
        expect(screen.queryAllByText("Đang tải…")).toHaveLength(0);
      });
    }
  }
});
