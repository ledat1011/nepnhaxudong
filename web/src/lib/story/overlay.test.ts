import { afterEach, describe, expect, it } from "vitest";
import { buildOverlay, showOverlay } from "./overlay";
import { SCENE_LAYERS, STEP2_PICTURES } from "./scene-layers";

function stageWithSketch(): HTMLElement {
  const stage = document.createElement("div");
  const sketch = document.createElement("img");
  sketch.src = "/story/canh.webp";
  stage.append(sketch);
  document.body.append(stage);
  return stage;
}

/** jsdom loads no images: fire `load` (or `error` for the names given) on every new image. */
async function settle(stage: HTMLElement, failing: string[] = []) {
  await Promise.resolve();
  stage.querySelector<HTMLImageElement>(":scope > img")?.dispatchEvent(new Event("load"));
  await new Promise((r) => setTimeout(r, 0));
  for (const img of stage.querySelectorAll<HTMLImageElement>("[data-story-overlay] img")) {
    img.dispatchEvent(new Event(failing.includes(img.dataset.part ?? "") ? "error" : "load"));
  }
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("buildOverlay", () => {
  it("lays each cut layer over the sketch at its box, hidden until shown", async () => {
    const stage = stageWithSketch();
    const pending = buildOverlay(stage, "say");
    await settle(stage);
    const overlay = await pending;
    expect(overlay).not.toBeNull();
    const fan = SCENE_LAYERS.say![0];
    const img = overlay!.parts.fan as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(fan.src);
    expect(img.style.left).toBe(`${fan.left}%`);
    expect(img.style.width).toBe(`${fan.width}%`);
    expect(img.style.transformOrigin).toBe(`${fan.originX}% ${fan.originY}%`);
    expect(overlay!.root.getAttribute("aria-hidden")).toBe("true");
    expect(overlay!.root.style.visibility).toBe("hidden");
    showOverlay(overlay!);
    expect(overlay!.root.style.visibility).toBe("visible");
  });

  it("puts every patch under every part, and the effects above them", async () => {
    const stage = stageWithSketch();
    const pending = buildOverlay(stage, "den-tay-khach");
    await settle(stage);
    const overlay = (await pending)!;
    const order = [...overlay.root.children].map((el) => (el as HTMLElement).dataset.part ?? "effects");
    expect(order).toEqual([...SCENE_LAYERS["den-tay-khach"]!.map((l) => l.name), "effects"]);
  });

  it("gives step 2 its young-rice picture under the parts and its night picture on top", async () => {
    const stage = stageWithSketch();
    const pending = buildOverlay(stage, "nang-mua-gio");
    await settle(stage);
    const overlay = (await pending)!;
    const kids = [...overlay.root.children] as HTMLElement[];
    expect(kids[0].dataset.part).toBe("young");
    expect(kids.at(-1)?.dataset.part).toBe("night");
    expect(overlay.parts.young.getAttribute("src")).toBe(STEP2_PICTURES.young);
    expect(overlay.parts.night.style.opacity).toBe("0");
  });

  it("builds the effects layer alone for a scene without cut layers", async () => {
    const stage = stageWithSketch();
    const pending = buildOverlay(stage, "mam-com");
    await settle(stage);
    const overlay = (await pending)!;
    expect(overlay.root.querySelectorAll("img")).toHaveLength(0);
    expect(overlay.effects.getAttribute("viewBox")).toBe("0 0 1200 675");
  });

  it("leaves the still sketch alone when one layer fails to load", async () => {
    const stage = stageWithSketch();
    const pending = buildOverlay(stage, "den-tay-khach");
    await settle(stage, ["truck"]);
    expect(await pending).toBeNull();
    expect(stage.querySelector("[data-story-overlay]")).toBeNull();
    expect(stage.querySelector("img")?.getAttribute("src")).toBe("/story/canh.webp");
  });
});
