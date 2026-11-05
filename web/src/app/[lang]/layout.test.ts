import { describe, expect, it, vi } from "vitest";
import { viewport } from "./layout";

vi.mock("../fonts", () => ({ fontClassName: "" }));

describe("public layout viewport", () => {
  it("colours the phone's browser bar Trắng gạo, like the page", () => {
    expect(String(viewport.themeColor).toLowerCase()).toBe("#fbf7ee");
  });
});
