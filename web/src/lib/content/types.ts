import type { Lang } from "@/lib/i18n/langs";

export type ImageRef = { url: string; width: number; height: number; alt: string };

export type Packaging = { weightGrams: number; priceVnd: number | null };

export type Product = {
  name: string;
  description: string;
  /**
   * In this order (spec 3.2): round and plump, soft, fragrant. The site shows one icon per
   * place in that order, so the admin must keep it. Features after the third get no icon.
   */
  features: string[];
  cookingTips: string;
  showPrice: boolean;
  packagings: Packaging[];
  images: ImageRef[];
};

export type TimelineEvent = {
  year: number;
  title: string;
  description: string;
  image: ImageRef | null;
};

export type PressMention = {
  title: string;
  sourceName: string;
  url: string;
  publishedOn: string | null;
  image: ImageRef | null;
};

export type StorySummary = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  cover: ImageRef | null;
};

export type StoryDetail = StorySummary & {
  bodyHtml: string;
  alternateSlug: string | null;
};

export type Contact = {
  phone: string | null;
  zalo: string | null;
  messenger: string | null;
  address: string | null;
  mapUrl: string | null;
  hours: string | null;
};

export type Social = {
  facebook: string | null;
  youtube: string | null;
  tiktok: string | null;
};

export type HomeData = {
  lang: Lang;
  brand: { tagline: string };
  products: Product[];
  timeline: TimelineEvent[];
  press: PressMention[];
  stories: StorySummary[];
  contact: Contact;
  social: Social;
};

export interface ContentClient {
  getHome(lang: Lang): Promise<HomeData>;
  getStories(lang: Lang, page: number): Promise<StorySummary[]>;
  getStory(lang: Lang, slug: string): Promise<StoryDetail | null>;
}
