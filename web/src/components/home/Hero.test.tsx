import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Hero } from "./Hero";

const dict = getDictionary("vi");

function renderHero(zalo: string | null, hasJourney = true) {
  return render(
    <Hero lang="vi" dict={dict} tagline="[MẪU] Khẩu hiệu" zalo={zalo} hasJourney={hasJourney} />,
  );
}

describe("Hero", () => {
  it("has the brand name as the only h1 and shows the tagline", () => {
    renderHero("0000 000 000");
    expect(screen.getByRole("heading", { level: 1, name: "Nếp Nhà" })).toBeInTheDocument();
    expect(screen.getByText("[MẪU] Khẩu hiệu")).toBeInTheDocument();
  });

  it("links the Zalo button to the Zalo number", () => {
    renderHero("0000 000 000");
    expect(screen.getByRole("link", { name: dict.hero.zaloCta })).toHaveAttribute(
      "href",
      "https://zalo.me/0000000000",
    );
  });

  it("has no Zalo button when there is no Zalo number", () => {
    renderHero(null);
    expect(screen.queryByRole("link", { name: dict.hero.zaloCta })).not.toBeInTheDocument();
  });

  it("links the journey button to the journey section", () => {
    renderHero(null);
    expect(screen.getByRole("link", { name: dict.hero.journeyCta })).toHaveAttribute(
      "href",
      "/vi#hanh-trinh",
    );
  });

  it("has no journey button when the page has no journey", () => {
    renderHero(null, false);
    expect(screen.queryByRole("link", { name: dict.hero.journeyCta })).not.toBeInTheDocument();
  });

  it("draws the hero scene behind the content instead of the old field strip", () => {
    const { container } = renderHero(null);
    const scene = container.querySelector("section[data-hero-scene]");
    expect(scene).not.toBeNull();
    expect(scene?.querySelectorAll("[data-hero-cloud]")).toHaveLength(3);
    expect(scene?.querySelector("[data-hero-sun]")).not.toBeNull();
    expect(scene?.querySelectorAll("[data-hero-gust]")).toHaveLength(5);
    // The old FieldBackdrop strip (viewBox 0 0 1200 160) is gone.
    expect(container.querySelector('svg[viewBox="0 0 1200 160"]')).toBeNull();
  });

  it("keeps the text side plain: the section has no sky gradient", () => {
    const { container } = renderHero(null);
    const section = container.querySelector("section[data-hero-scene]");
    expect(section).toHaveClass("bg-rice");
    expect(section?.className).not.toMatch(/from-sky|bg-linear/);
  });

  it("puts the sky, the clouds and the field in a faded panel behind the mascot only", () => {
    const { container } = renderHero("0000 000 000");
    const panel = container.querySelector("[data-hero-panel]");
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(panel).toHaveClass("hero-fade-side");
    const sky = panel?.querySelector(".hero-fade-bottom");
    expect(sky?.className).toMatch(/bg-linear-to-b from-sky/);
    expect(sky?.querySelectorAll("[data-hero-cloud]")).toHaveLength(3);
    expect(sky?.querySelectorAll("[data-hero-gust]")).toHaveLength(5);
    expect(panel?.querySelector("h1, a, svg[data-mascot]")).toBeNull();
  });

  it("anchors the mascot to the bottom of the panel and sizes both from --hero-m", () => {
    const { container } = renderHero(null);
    const section = container.querySelector("section[data-hero-scene]");
    expect(section?.className).toContain("[--hero-m:");
    const box = container.querySelector("svg[data-mascot]")?.parentElement;
    expect(box).toHaveClass("w-(--hero-m)", "md:self-end");
    expect(box?.parentElement).toHaveClass("md:pb-0");
    expect(container.querySelector("[data-hero-panel]")?.className).toContain("h-[calc(2.5rem+var(--hero-m))]");
  });

  it("defines the fade masks with and without the -webkit- prefix", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const name of ["hero-fade-side", "hero-fade-bottom"]) {
      const rule = new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
      expect(rule, name).toMatch(/-webkit-mask-image:\s*linear-gradient/);
      expect(rule, name).toMatch(/(^|[^-])mask-image:\s*linear-gradient/);
    }
  });

  it("from md, starts the panel just after the text column, not at the middle", () => {
    const { container } = renderHero(null);
    const panel = container.querySelector("[data-hero-panel]");
    expect(panel).toHaveClass("hero-panel-reach");
    expect(panel?.className).not.toContain("md:left-1/2");
    const css = readFileSync("src/app/globals.css", "utf8");
    const media = /@media \(width >= 48rem\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    const rule = /\.hero-panel-reach\s*\{([^}]*)\}/.exec(media)?.[1] ?? "";
    // The text column ends at most 28rem (the tagline's max-w-md) after the container padding.
    expect(rule).toMatch(/left:\s*calc\(/);
    expect(rule).toContain("28rem");
  });

  it("puts the sun in the mascot box, behind the mascot", () => {
    const { container } = renderHero(null);
    const mascot = container.querySelector("svg[data-mascot]");
    const sun = container.querySelector("[data-hero-sun]")?.closest("svg");
    expect(sun?.parentElement).toBe(mascot?.parentElement);
    expect(sun?.compareDocumentPosition(mascot as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("has the pause button for the motion", () => {
    renderHero(null);
    expect(screen.getByRole("button", { name: dict.motion.pause, hidden: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders the mascot once", () => {
    const { container } = renderHero(null);
    expect(container.querySelectorAll("g#head")).toHaveLength(1);
  });
});
