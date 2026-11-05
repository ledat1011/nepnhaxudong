import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";

const { search } = vi.hoisted(() => ({ search: { value: "" } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search.value),
  usePathname: () => "/admin/test",
}));

import { FieldFocus } from "./FieldFocus";

const missing = { vi: "Hạt tròn", en: null };

/** A form that loads after a moment, like the edit screens. */
function LateForm({ delay }: { delay: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return ready ? (
    <div>
      <BilingualField label="Tên sản phẩm" value={missing} onChange={() => {}} />
      <BilingualField label="Mô tả" value={missing} onChange={() => {}} />
    </div>
  ) : (
    <p>Đang tải…</p>
  );
}

function TabbedForm() {
  const [tab, setTab] = useState("vi");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="vi">Tiếng Việt</TabsTrigger>
        <TabsTrigger value="en">English</TabsTrigger>
      </TabsList>
      <TabsContent value="vi">
        <label htmlFor="title-vi">Tiêu đề</label>
        <input id="title-vi" />
      </TabsContent>
      <TabsContent value="en">
        <label htmlFor="title-en">Tiêu đề</label>
        <input id="title-en" />
      </TabsContent>
    </Tabs>
  );
}

beforeEach(() => {
  // Only the timers: the MutationObserver needs the real microtask queue.
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout"] });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  search.value = "";
});

describe("FieldFocus", () => {
  it("waits for the form to load, then scrolls to the field of the link, focuses it and marks it", async () => {
    search.value = "o=product.description.en";
    render(
      <>
        <FieldFocus />
        <LateForm delay={300} />
      </>,
    );
    // In steps: React shows the loaded form when act ends, and the field is focused a moment later.
    await act(async () => vi.advanceTimersByTimeAsync(400));
    await act(async () => vi.advanceTimersByTimeAsync(400));
    expect(screen.getByRole("group", { name: /^Mô tả/ }).contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toHaveAccessibleName("English");
    expect(document.activeElement).toHaveAttribute("data-field-target");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("opens the right tab first", async () => {
    search.value = "o=story.title.en";
    render(
      <>
        <FieldFocus />
        <TabbedForm />
      </>,
    );
    // In steps: React shows the loaded form when act ends, and the field is focused a moment later.
    await act(async () => vi.advanceTimersByTimeAsync(400));
    await act(async () => vi.advanceTimersByTimeAsync(400));
    expect(screen.getByRole("tab", { name: "English" })).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toHaveAttribute("id", "title-en");
  });

  it("does nothing for an unknown field", async () => {
    search.value = "o=khong-co";
    render(
      <>
        <FieldFocus />
        <LateForm delay={0} />
      </>,
    );
    // In steps: React shows the loaded form when act ends, and the field is focused a moment later.
    await act(async () => vi.advanceTimersByTimeAsync(400));
    await act(async () => vi.advanceTimersByTimeAsync(400));
    expect(document.activeElement).toBe(document.body);
  });

  it("stops looking once the user does something else, so a dialog opened later keeps its own focus", async () => {
    search.value = "o=product.description.en";
    render(
      <>
        <FieldFocus />
        <LateForm delay={2000} />
      </>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(300));
    fireEvent.pointerDown(document.body);
    await act(async () => vi.advanceTimersByTimeAsync(2500));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(screen.getByRole("group", { name: /^Mô tả/ })).toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
  });
});
