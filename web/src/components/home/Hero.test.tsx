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

  it("opens the Zalo contact dialog from the Zalo button", () => {
    renderHero("0000 000 000");
    expect(screen.getByRole("link", { name: dict.hero.zaloCta })).toHaveAttribute(
      "aria-haspopup",
      "dialog",
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

  it("renders the mascot once", () => {
    const { container } = renderHero(null);
    expect(container.querySelectorAll("g#head")).toHaveLength(1);
  });
});
