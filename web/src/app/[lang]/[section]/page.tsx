import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StoryList } from "@/components/story/StoryList";
import { StoryListSkeleton } from "@/components/story/StoryListSkeleton";
import { getContentClient } from "@/lib/content/client";
import { buildHomeNav } from "@/lib/content/home-nav";
import { parsePage } from "@/lib/content/story-routing";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLang } from "@/lib/i18n/langs";
import { isStorySection, storiesPath } from "@/lib/i18n/routes";
import { buildMetadata, withSiteName } from "@/lib/seo/metadata";

// No generateStaticParams here: the page reads `?page`, and Next cannot cache a page
// with search params. It renders per request; the API data is still cached by tag.
// Nothing is built at `next build`, so the build never needs the content API.
// No route-level loading.tsx: it would start the response before `notFound()` runs, so a bad
// `?page` would answer 200. The skeleton is a Suspense boundary inside the page instead.

type StoryListPageProps = {
  params: Promise<{ lang: string; section: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: StoryListPageProps): Promise<Metadata> {
  const { lang, section } = await params;
  if (!isLang(lang) || !isStorySection(lang, section)) return {};
  const page = parsePage((await searchParams).page);
  if (page === null) return {};
  const { sections, site } = getDictionary(lang);
  return buildMetadata({
    lang,
    title: withSiteName(sections.story),
    description: site.description,
    paths: { vi: storiesPath("vi", page), en: storiesPath("en", page) },
  });
}

export default async function StoryListPage({ params, searchParams }: StoryListPageProps) {
  const { lang, section } = await params;
  if (!isLang(lang) || !isStorySection(lang, section)) notFound();
  const page = parsePage((await searchParams).page);
  if (page === null) notFound();

  const dict = getDictionary(lang);
  const client = getContentClient();
  // A later page with no stories does not exist. Its stories are loaded here, before anything
  // streams, so the answer is a real 404. The first page always exists: it streams at once and
  // shows the skeleton until `StoryList` has its data (the same call, cached by tag).
  const [home, laterPage] = await Promise.all([
    client.getHome(lang),
    page > 0 ? client.getStories(lang, page) : null,
  ]);
  if (laterPage !== null && laterPage.length === 0) notFound();

  const nav = buildHomeNav(home, dict);

  return (
    <>
      <SiteHeader
        lang={lang}
        dict={dict}
        nav={nav}
        zalo={home.contact.zalo}
        alternateHref={storiesPath(lang === "vi" ? "en" : "vi", page)}
      />
      <main id="noi-dung">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <h1 className="mb-10 font-display text-4xl leading-[1.3] text-balance text-earth md:text-5xl">
            {dict.sections.story}
          </h1>
          <Suspense fallback={<StoryListSkeleton label={dict.loading.stories} />}>
            <StoryList lang={lang} dict={dict} page={page} client={client} />
          </Suspense>
        </div>
      </main>
      <SiteFooter dict={dict} contact={home.contact} social={home.social} />
    </>
  );
}
