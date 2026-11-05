import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactSection } from "@/components/home/ContactSection";
import { Hero } from "@/components/home/Hero";
import { JourneySection } from "@/components/home/JourneySection";
import { PressSection } from "@/components/home/PressSection";
import { ProductSection } from "@/components/home/ProductSection";
import { RiceStory } from "@/components/home/RiceStory";
import { StoriesSection } from "@/components/home/StoriesSection";
import { HomeMotion } from "@/components/motion/HomeMotion";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getContentClient } from "@/lib/content/client";
import { buildHomeNav } from "@/lib/content/home-nav";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLang } from "@/lib/i18n/langs";
import { homePath } from "@/lib/i18n/routes";
import { buildHomeJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata, getSiteUrl, SITE_NAME } from "@/lib/seo/metadata";

// No page is built at `next build`, so the build never needs the content API.
// Each language is rendered on its first request and cached after that.
export const generateStaticParams = () => [];

type HomePageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const { site } = getDictionary(lang);
  return buildMetadata({
    lang,
    title: `${SITE_NAME} | ${site.tagline}`,
    description: site.description,
    paths: { vi: homePath("vi"), en: homePath("en") },
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const dict = getDictionary(lang);
  const home = await getContentClient().getHome(lang);
  const nav = buildHomeNav(home, dict);
  const has = (id: string) => nav.some((item) => item.id === id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildHomeJsonLd(home, getSiteUrl())) }}
      />
      <SiteHeader
        lang={lang}
        dict={dict}
        nav={nav}
        zalo={home.contact.zalo}
        alternateHref={homePath(lang === "vi" ? "en" : "vi")}
      />
      <main id="noi-dung">
        <Hero
          lang={lang}
          dict={dict}
          tagline={home.brand.tagline}
          zalo={home.contact.zalo}
          messenger={home.contact.messenger}
          hasJourney={has("hanh-trinh")}
        />
        {has("san-pham") && (
          <section aria-labelledby="san-pham">
            {/* Less space at the top on a phone, so the bag shows on the first screen (CK 4.2). */}
            <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 md:py-24">
              <SectionHeading id="san-pham" title={dict.sections.product} />
              {home.products.map((product, place) => (
                <ProductSection
                  key={product.name}
                  lang={lang}
                  dict={dict}
                  product={product}
                  showBag={place === 0}
                />
              ))}
            </div>
          </section>
        )}
        <RiceStory dict={dict} zalo={home.contact.zalo} />
        {has("hanh-trinh") && <JourneySection dict={dict} events={home.timeline} />}
        {has("bao-chi") && <PressSection lang={lang} dict={dict} items={home.press} />}
        {has("cau-chuyen") && <StoriesSection lang={lang} dict={dict} stories={home.stories} />}
        <ContactSection dict={dict} contact={home.contact} />
        <HomeMotion />
      </main>
      <SiteFooter dict={dict} contact={home.contact} social={home.social} />
    </>
  );
}
