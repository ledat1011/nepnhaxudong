import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { STORY_SCENES } from "@/lib/story/scenes";
import { RiceStory } from "./RiceStory";

const KEYS = {
  "cay-ma": "cayMa",
  "nang-mua-gio": "nangMuaGio",
  gat: "gat",
  say: "say",
  "xay-xat": "xayXat",
  "dong-goi": "dongGoi",
  "den-tay-khach": "denTayKhach",
  "mam-com": "mamCom",
} as const;

describe("RiceStory", () => {
  it("has the section heading and the hook attributes", () => {
    const dict = getDictionary("vi");
    const { container } = render(<RiceStory dict={dict} zalo={null} />);
    const heading = screen.getByRole("heading", { level: 2, name: dict.story.title });
    expect(heading).toHaveAttribute("id", "tu-hat-lua");
    const section = container.querySelector("section[data-rice-story]");
    expect(section).toHaveAttribute("aria-labelledby", "tu-hat-lua");
    expect(container.querySelector("div[data-story-viewport] > ol[data-story-track]")).not.toBeNull();
  });

  it("lists the eight scenes in order with a fixed-size lazy image", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    const items = [...container.querySelectorAll("li[data-story-scene]")];
    expect(items.map((li) => li.getAttribute("data-story-scene"))).toEqual(
      STORY_SCENES.map((s) => s.slug),
    );
    items.forEach((li, i) => {
      const img = li.querySelector("img");
      expect(img).toHaveAttribute("src", STORY_SCENES[i].src);
      expect(img).toHaveAttribute("width", "800");
      expect(img).toHaveAttribute("height", "600");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("alt", "");
    });
  });

  it.each(["vi", "en"] as const)("shows the %s title and sentence of every scene", (lang) => {
    const dict = getDictionary(lang);
    const { container } = render(<RiceStory dict={dict} zalo={null} />);
    for (const { slug } of STORY_SCENES) {
      const li = container.querySelector(`li[data-story-scene="${slug}"]`) as HTMLElement;
      const key = KEYS[slug];
      const title = dict.story[`${key}Title` as keyof typeof dict.story];
      const text = dict.story[`${key}Text` as keyof typeof dict.story];
      expect(title).not.toBe("");
      expect(li.querySelector("h3")).toHaveTextContent(title);
      expect(li.querySelector("p")).toHaveTextContent(text);
    }
  });

  it("has an 8-item progress list that screen readers skip", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    const progress = container.querySelector("ol[data-story-progress]");
    expect(progress).toHaveAttribute("aria-hidden", "true");
    expect(progress?.querySelectorAll("li")).toHaveLength(8);
  });

  it("has a skip link to an element that exists", () => {
    const dict = getDictionary("en");
    const { container } = render(<RiceStory dict={dict} zalo={null} />);
    const skip = container.querySelector("a[data-story-skip]");
    expect(skip).toHaveAttribute("href", "#sau-cau-chuyen");
    expect(skip).toHaveTextContent(dict.story.skip);
    const target = container.querySelector("#sau-cau-chuyen");
    expect(target).toHaveAttribute("tabindex", "-1");
  });

  it("shows the Zalo link in the last scene only when there is a number", () => {
    const dict = getDictionary("vi");
    const { container, rerender } = render(<RiceStory dict={dict} zalo="0912 345 678" />);
    const link = screen.getByRole("link", { name: dict.hero.zaloCta });
    expect(link.getAttribute("href")).toContain("zalo.me/");
    const last = container.querySelectorAll("li[data-story-scene]")[7];
    expect(last.contains(link)).toBe(true);
    rerender(<RiceStory dict={dict} zalo={null} />);
    expect(screen.queryByRole("link", { name: dict.hero.zaloCta })).toBeNull();
  });

  it("is a vertical list until the story motion sets its own flag", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    const section = container.querySelector("section[data-rice-story]") as HTMLElement;
    expect(section).not.toHaveAttribute("data-story-mode");
    // The horizontal layout is keyed to the section's own flag, never to the page-wide motion flag.
    expect(section.innerHTML).not.toContain("data-motion");
    const progress = container.querySelector("ol[data-story-progress]") as HTMLElement;
    expect(progress.className).toContain("hidden");
    expect(progress.className).toContain("[section[data-story-mode=horizontal]_&]:flex");
  });
});
