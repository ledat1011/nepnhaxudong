import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Pagination } from "@/components/story/Pagination";
import { StoryCard } from "@/components/story/StoryCard";
import { getContentClient } from "@/lib/content/client";
import { buildHomeNav } from "@/lib/content/home-nav";
import { hasNextPage, parsePage } from "@/lib/content/story-routing";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLang } from "@/lib/i18n/langs";
import { isStorySection, storiesPath } from "@/lib/i18n/routes";

// No generateStaticParams here: the page reads `?page`, and Next cannot cache a page
// with search params. It renders per request; the API data is still cached by tag.
// Nothing is built at `next build`, so the build never needs the content API.

type StoryListPageProps = {
  params: Promise<{ lang: string; section: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function StoryListPage({ params, searchParams }: StoryListPageProps) {
  const { lang, section } = await params;
  if (!isLang(lang) || !isStorySection(lang, section)) notFound();
  const page = parsePage((await searchParams).page);
  if (page === null) notFound();

  const dict = getDictionary(lang);
  const client = getContentClient();
  const [home, stories] = await Promise.all([client.getHome(lang), client.getStories(lang, page)]);
  if (page > 0 && stories.length === 0) notFound();

  const nav = buildHomeNav(home, dict);
  const hasNext = await hasNextPage(client, lang, page, stories);

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
          <h1 className="mb-10 font-display text-4xl leading-[1.3] text-earth md:text-5xl">
            {dict.sections.story}
          </h1>
          {stories.length === 0 ? (
            <p className="text-lg">{dict.stories.empty}</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <li key={story.slug}>
                  <StoryCard lang={lang} story={story} dict={dict} headingLevel={2} />
                </li>
              ))}
            </ul>
          )}
          <Pagination lang={lang} page={page} hasNext={hasNext} dict={dict} />
        </div>
      </main>
      <SiteFooter dict={dict} contact={home.contact} social={home.social} />
    </>
  );
}
