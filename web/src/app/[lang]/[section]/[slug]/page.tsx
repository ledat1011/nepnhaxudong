import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactInvite } from "@/components/contact/ContactInvite";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StoryBody } from "@/components/story/StoryBody";
import { ContentImage } from "@/components/ui/ContentImage";
import { LinkPendingStatus } from "@/components/ui/LinkPendingStatus";
import { getContentClient } from "@/lib/content/client";
import { buildHomeNav } from "@/lib/content/home-nav";
import { storyAlternates } from "@/lib/content/story-routing";
import { formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLang } from "@/lib/i18n/langs";
import { isStorySection, storiesPath } from "@/lib/i18n/routes";
import { buildMetadata, withSiteName } from "@/lib/seo/metadata";

// No page is built at `next build`, so the build never needs the content API.
// Each story is rendered on its first request and cached after that.
export const generateStaticParams = () => [];

type StoryPageProps = {
  params: Promise<{ lang: string; section: string; slug: string }>;
};

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { lang, section, slug } = await params;
  if (!isLang(lang) || !isStorySection(lang, section)) return {};
  const story = await getContentClient().getStory(lang, slug);
  if (story === null) return {};
  return buildMetadata({
    lang,
    title: withSiteName(story.title),
    description: story.excerpt || getDictionary(lang).site.description,
    paths: storyAlternates(lang, story),
    type: "article",
    publishedTime: story.publishedAt,
  });
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { lang, section, slug } = await params;
  if (!isLang(lang) || !isStorySection(lang, section)) notFound();

  const dict = getDictionary(lang);
  const client = getContentClient();
  const [home, story] = await Promise.all([client.getHome(lang), client.getStory(lang, slug)]);
  if (story === null) notFound();

  const nav = buildHomeNav(home, dict);
  const alternates = storyAlternates(lang, story);

  return (
    <>
      <SiteHeader
        lang={lang}
        dict={dict}
        nav={nav}
        zalo={home.contact.zalo}
        alternateHref={alternates[lang === "vi" ? "en" : "vi"]}
      />
      <main id="noi-dung">
        <article className="mx-auto max-w-3xl px-4 py-12 md:py-20">
          <h1 className="font-sans text-3xl font-bold leading-tight text-balance text-earth [overflow-wrap:anywhere] md:text-5xl md:leading-tight">
            {story.title}
          </h1>
          <time dateTime={story.publishedAt} className="mt-4 block font-bold text-coat">
            {formatDate(story.publishedAt, lang)}
          </time>
          {story.cover !== null && (
            <div
              data-story-cover
              className="mt-8 aspect-[16/9] overflow-hidden rounded-2xl border-2 border-grain"
            >
              <ContentImage
                image={story.cover}
                sizes="(min-width: 768px) 48rem, 100vw"
                placeholderLabel={dict.image.placeholder}
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="mt-8">
            <StoryBody html={story.bodyHtml} />
          </div>
          <ContactInvite lang={lang} dict={dict} contact={home.contact} />
          <p className="mt-12">
            <Link
              href={storiesPath(lang)}
              className="inline-flex min-h-11 items-center rounded-full border-2 border-coat px-6 py-2 font-bold text-coat underline-offset-4 hover:underline hover:bg-coat hover:text-rice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
            >
              ← {dict.stories.backToList}
              <LinkPendingStatus label={dict.loading.page} />
            </Link>
          </p>
        </article>
      </main>
      <SiteFooter dict={dict} contact={home.contact} social={home.social} />
    </>
  );
}
