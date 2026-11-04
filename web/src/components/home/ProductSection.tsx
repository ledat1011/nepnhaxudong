import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand/colors";
import { toImageSrc } from "@/lib/content/image-src";
import type { Product } from "@/lib/content/types";
import { formatPrice, formatWeight } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { Gallery } from "./Gallery";

type ProductSectionProps = {
  lang: Lang;
  dict: Dictionary;
  product: Product;
};

const { earth, coat, grain, sprout } = BRAND;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width="40"
      height="40"
      aria-hidden="true"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-10 w-10 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

/** Round, plump grain. */
function RoundGrainIcon() {
  return (
    <Icon>
      <ellipse cx="20" cy="20" rx="10" ry="13" fill={grain} stroke={coat} strokeWidth="2.5" />
      <path d="M16 14q2-3 5-3" stroke={earth} strokeWidth="2" />
    </Icon>
  );
}

/** Two grains held together by a stretching strand: sticky and soft. */
function SoftIcon() {
  return (
    <Icon>
      <ellipse cx="13" cy="13" rx="6" ry="8" fill={grain} stroke={coat} strokeWidth="2.5" transform="rotate(-20 13 13)" />
      <ellipse cx="27" cy="29" rx="6" ry="8" fill={grain} stroke={coat} strokeWidth="2.5" transform="rotate(-20 27 29)" />
      <path d="M16 19Q20 22 24 23" stroke={coat} strokeWidth="2.5" />
    </Icon>
  );
}

/** Steam rising from a grain: fragrant. */
function FragrantIcon() {
  return (
    <Icon>
      <ellipse cx="20" cy="31" rx="7" ry="6" fill={grain} stroke={coat} strokeWidth="2.5" />
      <g stroke={sprout} strokeWidth="2.5">
        <path d="M13 21q-3-4 0-7t0-7" />
        <path d="M20 21q-3-4 0-7t0-7" />
        <path d="M27 21q-3-4 0-7t0-7" />
      </g>
    </Icon>
  );
}

// Features are shown in the order the API returns them: round, soft, fragrant.
const FEATURE_ICONS = [RoundGrainIcon, SoftIcon, FragrantIcon];

const SUBHEADING_CLASS = "mb-3 text-sm font-bold uppercase tracking-wide text-coat";

export function ProductSection({ lang, dict, product }: ProductSectionProps) {
  // The Gallery runs in the browser, which cannot read SITE_URL, so the sources are built here.
  const images = product.images.map(({ url, ...rest }) => ({ ...rest, src: toImageSrc(url) }));

  return (
    <article className="grid gap-8 md:grid-cols-2 md:gap-12 [&+&]:mt-16">
      <div data-reveal>
        <Gallery images={images} dict={dict} />
      </div>
      <div>
        <h3 className="text-2xl font-bold md:text-3xl">{product.name}</h3>
        <p className="mt-3 text-lg leading-relaxed">{product.description}</p>

        {product.features.length > 0 && (
          <div data-reveal className="mt-8">
            <h4 className={SUBHEADING_CLASS}>{dict.product.features}</h4>
            <ul className="space-y-3">
              {product.features.map((feature, i) => {
                const FeatureIcon = FEATURE_ICONS[i % FEATURE_ICONS.length];
                return (
                  <li key={feature} className="flex items-center gap-3">
                    <FeatureIcon />
                    <span className="font-medium">{feature}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {product.packagings.length > 0 && (
          <div data-reveal className="mt-8">
            <h4 className={SUBHEADING_CLASS}>{dict.product.packaging}</h4>
            <ul className="flex flex-wrap gap-3">
              {product.packagings.map(({ weightGrams, priceVnd }) => (
                <li
                  key={weightGrams}
                  className="rounded-2xl border-2 border-straw bg-rice px-5 py-3"
                >
                  <p className="text-xl font-bold">{formatWeight(weightGrams, lang)}</p>
                  <p className="text-sm font-medium text-coat">
                    {product.showPrice && priceVnd !== null
                      ? formatPrice(priceVnd, lang)
                      : dict.product.contactPrice}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {product.cookingTips && (
          <div data-reveal className="mt-8 rounded-2xl bg-straw p-5">
            <h4 className={SUBHEADING_CLASS}>{dict.product.dishes}</h4>
            <p className="leading-relaxed">{product.cookingTips}</p>
          </div>
        )}
      </div>
    </article>
  );
}
