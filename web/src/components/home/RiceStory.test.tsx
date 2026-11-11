import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { BRAND } from "@/lib/brand/colors";
import { roadBend, roadPath } from "@/lib/story/road";
import { STORY_SCENES } from "@/lib/story/scenes";
import { Hero } from "./Hero";
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
    expect(container.querySelectorAll("div[data-story-road-wrap] > ol[data-story-list] > li")).toHaveLength(8);
    // Tailwind's reset removes the list styling, and Safari then drops the list role.
    expect(container.querySelector("ol[data-story-list]")).toHaveAttribute("role", "list");
  });

  it("is one vertical road timeline: no pinned track, no progress bar", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    for (const hook of ["data-story-pin", "data-story-viewport", "data-story-track", "data-story-progress"]) {
      expect(container.querySelector(`[${hook}]`), hook).toBeNull();
    }
    expect(container.innerHTML).not.toContain("data-story-mode");
  });

  it("draws one stretch of road and one stop per scene, hidden from screen readers", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    const items = [...container.querySelectorAll("li[data-story-scene]")];
    items.forEach((li, i) => {
      const road = li.querySelector("[data-story-road]") as HTMLElement;
      expect(road).toHaveAttribute("aria-hidden", "true");
      expect(road).toHaveAttribute("data-bend", String(roadBend(i)));
      const paths = [...road.querySelectorAll("path")];
      expect(paths.length).toBeGreaterThanOrEqual(3);
      paths.forEach((path) => {
        expect(path).toHaveAttribute("d", roadPath(roadBend(i)));
        expect(path).toHaveAttribute("vector-effect", "non-scaling-stroke");
      });
      const strokes = paths.map((path) => path.getAttribute("stroke"));
      expect(strokes).toEqual(expect.arrayContaining([BRAND.coat, BRAND.straw]));
      // The darker part already passed shows only when the motion code runs.
      expect(road.querySelector("[data-story-road-passed]")?.getAttribute("class")).toContain("opacity-0");
      expect(li.querySelector("[data-story-stop]")).toHaveAttribute("aria-hidden", "true");
    });
    const grain = container.querySelector("[data-story-road-wrap] > [data-story-grain]") as HTMLElement;
    expect(grain).toHaveAttribute("aria-hidden", "true");
    expect(grain.getAttribute("class")).toContain("opacity-0");
    // No layer for a grain that does not move: the motion code adds the hint.
    expect(grain.getAttribute("class")).not.toContain("will-change");
  });

  it("puts the scenes left and right of the road from 768 px, the first one on the left", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    const items = [...container.querySelectorAll("li[data-story-scene]")];
    items.forEach((li, i) => {
      const classes = li.getAttribute("class") ?? "";
      // Below 768 px the road is on the left and every scene is to its right.
      expect(classes).toContain("pl-14");
      expect(classes).toContain("md:w-1/2");
      if (i % 2 === 0) expect(classes).toContain("md:pr-16");
      else expect(classes).toContain("md:ml-auto");
    });
  });

  it("keeps each scene narrow and close to the road from 768 px, with a small gap below", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    const items = [...container.querySelectorAll("li[data-story-scene]")];
    items.forEach((li, i) => {
      expect(li.getAttribute("class")).toContain("md:pb-8");
      const content = li.querySelector(":scope > [data-story-content]") as HTMLElement;
      expect(content).not.toBeNull();
      expect(content.querySelector("img")).not.toBeNull();
      expect(content.querySelector("[data-story-step]")).not.toBeNull();
      const classes = content.getAttribute("class") ?? "";
      expect(classes).toMatch(/md:max-w-\[\d+rem\]/);
      // A scene on the left is pushed to the right edge of its half, next to the road.
      if (i % 2 === 0) expect(classes).toContain("md:ml-auto");
      else expect(classes).not.toContain("md:ml-auto");
    });
  });

  it("fits each picture to the text column with soft edges, never past the page", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    expect(container.querySelector("section[data-rice-story]")?.getAttribute("class")).toContain("overflow-x-clip");
    const items = [...container.querySelectorAll("li[data-story-scene]")];
    items.forEach((li) => {
      const stage = li.querySelector("[data-story-stage]") as HTMLElement;
      const classes = stage.getAttribute("class") ?? "";
      // A 16:9 stage (the 1200 x 675 sketch) as wide as the column; the fade softens its four
      // edges, and it clips the moving parts that the motion code lays over the sketch.
      for (const name of ["story-scene-fade", "aspect-[16/9]", "w-full", "overflow-hidden", "relative"]) {
        expect(classes, name).toContain(name);
      }
      expect(classes).not.toContain("max-w-none");
      expect(stage.querySelector("img")?.getAttribute("class")).toContain("h-full w-full");
    });
  });

  it("darkens almost the whole road surface, leaving the brown edges", () => {
    const { container } = render(<RiceStory dict={getDictionary("vi")} zalo={null} />);
    const road = container.querySelector("[data-story-road]") as HTMLElement;
    const widths = (path: Element | null) =>
      [...(path?.getAttribute("class") ?? "").matchAll(/\[stroke-width:(\d+)px\]/g)].map((m) => Number(m[1]));
    const [edge, surface] = [...road.querySelectorAll(":scope > svg path")].map(widths);
    const band = widths(road.querySelector("[data-story-road-passed] path"));
    // Below 768 px, then from 768 px.
    band.forEach((width, i) => {
      expect(width).toBeGreaterThanOrEqual(surface[i] * 0.85);
      expect(width).toBeLessThan(edge[i]);
    });
  });

  it.each(["vi", "en"] as const)("labels each %s scene with its step number", (lang) => {
    const dict = getDictionary(lang);
    const { container } = render(<RiceStory dict={dict} zalo={null} />);
    const labels = [...container.querySelectorAll("li[data-story-scene] [data-story-step]")].map((el) => el.textContent);
    expect(labels).toEqual(STORY_SCENES.map((_, i) => `${dict.story.step} ${i + 1}`));
    expect(dict.story.step).toBe(lang === "vi" ? "Bước" : "Step");
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
      expect(img).toHaveAttribute("width", "1200");
      expect(img).toHaveAttribute("height", "675");
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
      expect(li.querySelector("[data-story-text]")).toHaveTextContent(text);
    }
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
    const link = screen.getByRole("link", { name: dict.story.zaloCta });
    expect(link.getAttribute("href")).toContain("zalo.me/");
    const last = container.querySelectorAll("li[data-story-scene]")[7];
    expect(last.contains(link)).toBe(true);
    rerender(<RiceStory dict={dict} zalo={null} />);
    expect(screen.queryByRole("link", { name: dict.story.zaloCta })).toBeNull();
  });

  it("has its own pause button at the top, away from the road and the pictures", () => {
    const dict = getDictionary("vi");
    const { container } = render(<RiceStory dict={dict} zalo={null} />);
    const button = screen.getByRole("button", { name: dict.motion.pause, hidden: true });
    expect(button).toHaveAttribute("aria-pressed", "false");
    // Hidden until the motion code runs, like the hero button.
    expect(button).toHaveClass("hidden");
    expect(button.className).toContain("[html[data-motion=on]_&]:inline-flex");
    expect(button.closest("[data-story-road-wrap]")).toBeNull();
    const place = button.closest("[data-story-pause]");
    // Placed out of the flow, so showing it moves nothing on the page.
    expect(place).toHaveClass("absolute");
    const heading = screen.getByRole("heading", { level: 2, name: dict.story.title });
    expect(place?.parentElement?.contains(heading)).toBe(true);
    const wrap = container.querySelector("[data-story-road-wrap]") as Element;
    expect(place?.compareDocumentPosition(wrap)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("keeps the story button and the hero button in the same state", () => {
    const dict = getDictionary("vi");
    window.localStorage.clear();
    render(
      <>
        <Hero lang="vi" dict={dict} tagline="t" zalo={null} />
        <RiceStory dict={dict} zalo={null} />
      </>,
    );
    const buttons = () => screen.getAllByRole("button", { name: dict.motion.pause, hidden: true });
    expect(buttons()).toHaveLength(2);
    const [hero, story] = buttons();
    try {
      fireEvent.click(story);
      expect(buttons().map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "true"]);
      fireEvent.click(hero);
      expect(buttons().map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "false"]);
    } finally {
      window.localStorage.clear();
    }
  });
});
