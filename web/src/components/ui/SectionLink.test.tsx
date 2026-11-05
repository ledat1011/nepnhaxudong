import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionLink } from "./SectionLink";

describe("SectionLink", () => {
  type ScrollIntoView = (arg?: boolean | ScrollIntoViewOptions) => void;
  let scrollIntoView: ReturnType<typeof vi.fn<ScrollIntoView>>;

  beforeEach(() => {
    scrollIntoView = vi.fn<ScrollIntoView>();
    const target = document.createElement("h2");
    target.id = "tu-hat-lua";
    target.scrollIntoView = scrollIntoView;
    document.body.append(target);
  });

  afterEach(() => {
    document.getElementById("tu-hat-lua")?.remove();
    window.history.replaceState(null, "", "/");
  });

  function click() {
    render(<SectionLink href="/vi#tu-hat-lua">Quy trình</SectionLink>);
    return fireEvent.click(screen.getByRole("link", { name: "Quy trình" }));
  }

  it("scrolls to the section again when the address already ends in its hash", () => {
    window.history.replaceState(null, "", "/vi#tu-hat-lua");
    const notPrevented = click();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  it("leaves a different hash on the same page to the router", () => {
    window.history.replaceState(null, "", "/vi#san-pham");
    const notPrevented = click();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it("leaves another page to the router", () => {
    window.history.replaceState(null, "", "/vi/cau-chuyen#tu-hat-lua");
    const notPrevented = click();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it("leaves a click with a modifier key to the browser", () => {
    window.history.replaceState(null, "", "/vi#tu-hat-lua");
    render(<SectionLink href="/vi#tu-hat-lua">Quy trình</SectionLink>);
    fireEvent.click(screen.getByRole("link", { name: "Quy trình" }), { ctrlKey: true });
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
