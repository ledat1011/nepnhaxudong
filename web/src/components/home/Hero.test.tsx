import { render, screen } from "@testing-library/react";
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
