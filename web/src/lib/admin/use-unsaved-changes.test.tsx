import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { replace, signOut } = vi.hoisted(() => ({ replace: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/anh", useRouter: () => ({ replace }) }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ signOut }) }));

import { BottomNav } from "@/components/admin/shell/BottomNav";
import { MoreSheet } from "@/components/admin/shell/MoreSheet";
import { NavGuardProvider } from "./nav-guard";
import { useLeavePage, useUnsavedChanges } from "./use-unsaved-changes";

const QUESTION = "Bạn có thay đổi chưa lưu. Rời trang?";

afterEach(async () => {
  // Unmount now and let the guard remove its history entry, so the next test starts on a quiet history.
  cleanup();
  await settle();
  replace.mockReset();
  signOut.mockReset();
});

function Form({ dirty, keepsDraft = false }: { dirty: boolean; keepsDraft?: boolean }) {
  useUnsavedChanges(dirty, { keepsDraft });
  return <Link href="/admin/san-pham">Sản phẩm trong trang</Link>;
}

function Page({ dirty, keepsDraft = false }: { dirty: boolean; keepsDraft?: boolean }) {
  return (
    <NavGuardProvider>
      <Form dirty={dirty} keepsDraft={keepsDraft} />
      <BottomNav />
    </NavGuardProvider>
  );
}

function beforeUnload(): Event {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe("useUnsavedChanges", () => {
  it("asks before a bottom-nav link when the form is dirty, and stays on Cancel", async () => {
    const events = userEvent.setup();
    render(<Page dirty />);
    const reached = vi.fn();
    screen.getByRole("navigation", { name: "Menu chính" }).addEventListener("click", reached);
    const before = window.location.href;

    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    expect(reached).not.toHaveBeenCalled();

    await events.click(screen.getByRole("button", { name: "Ở lại" }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(window.location.href).toBe(before);
    expect(reached).not.toHaveBeenCalled();
  });

  it("lets the click through after the user confirms", async () => {
    const events = userEvent.setup();
    render(<Page dirty />);
    const reached = vi.fn((event: Event) => event.preventDefault());
    screen.getByRole("navigation", { name: "Menu chính" }).addEventListener("click", reached);
    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    await events.click(await screen.findByRole("button", { name: "Rời trang" }));
    // The click goes through after the guard has removed its back-button entry (one popstate later).
    await waitFor(() => expect(reached).toHaveBeenCalledTimes(1));
  });

  it("also guards any other link inside /admin", async () => {
    const events = userEvent.setup();
    render(<Page dirty />);
    await events.click(screen.getByRole("link", { name: "Sản phẩm trong trang" }));
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
  });

  it("does not ask when the form is clean", async () => {
    const events = userEvent.setup();
    render(<Page dirty={false} />);
    const reached = vi.fn((event: Event) => event.preventDefault());
    screen.getByRole("navigation", { name: "Menu chính" }).addEventListener("click", reached);
    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("adds beforeunload only while dirty", () => {
    const { rerender } = render(<Page dirty={false} />);
    expect(beforeUnload().defaultPrevented).toBe(false);
    rerender(<Page dirty />);
    expect(beforeUnload().defaultPrevented).toBe(true);
    rerender(<Page dirty={false} />);
    expect(beforeUnload().defaultPrevented).toBe(false);
  });
});

describe("leave question text", () => {
  it("says the changes will be lost for a form without a browser draft", async () => {
    const events = userEvent.setup();
    render(<Page dirty />);
    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    const question = await screen.findByRole("alertdialog", { name: QUESTION });
    expect(question).toHaveTextContent("Nếu rời trang, những thay đổi này sẽ mất.");
  });

  it("says the unfinished story stays on this phone when the form keeps a draft", async () => {
    const events = userEvent.setup();
    render(<Page dirty keepsDraft />);
    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    const question = await screen.findByRole("alertdialog", { name: QUESTION });
    expect(question).toHaveTextContent(
      "Bài đang viết dở vẫn được giữ trên máy này. Lần sau mở lại bài, trang sẽ hỏi bạn có muốn khôi phục không.",
    );
    expect(question).not.toHaveTextContent("sẽ mất");
  });
});

describe("nav guard scope", () => {
  /** Renders a dirty form with extra links, and counts the clicks that reach the page (not stopped by the guard). */
  function setupLinks() {
    const reached = vi.fn((event: Event) => event.preventDefault());
    const view = render(
      <NavGuardProvider>
        <Form dirty />
        <div onClick={(event) => reached(event.nativeEvent)}>
          <Link href="/vi/san-pham">Trang công khai</Link>
          <Link href="/admin/san-pham" target="_blank">Tab mới</Link>
          <Link href="/admin/san-pham" download>Tải về</Link>
          <a href="https://example.com/x">Ngoài</a>
          <a href="#phan-2">Neo</a>
        </div>
      </NavGuardProvider>,
    );
    return { reached, ...view };
  }

  it("guards a link to a public page of this site", async () => {
    const { reached } = setupLinks();
    await userEvent.setup().click(screen.getByRole("link", { name: "Trang công khai" }));
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    expect(reached).not.toHaveBeenCalled();
  });

  it.each([
    ["ctrl", { ctrlKey: true }],
    ["meta", { metaKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
    ["middle button", { button: 1 }],
  ])("lets a %s click through", (_name, init) => {
    const { reached } = setupLinks();
    fireEvent.click(screen.getByRole("link", { name: "Trang công khai" }), init);
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it.each(["Tab mới", "Tải về", "Ngoài", "Neo"])("does not guard the link %s", (name) => {
    const { reached } = setupLinks();
    fireEvent.click(screen.getByRole("link", { name }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("removes its click listener on unmount", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<NavGuardProvider>x</NavGuardProvider>);
    const added = add.mock.calls.find(([type]) => type === "click");
    expect(added).toBeDefined();
    unmount();
    expect(remove).toHaveBeenCalledWith("click", added![1], added![2]);
    add.mockRestore();
    remove.mockRestore();
  });

  it("does not guard a link inside text that is being edited", () => {
    const reached = vi.fn((event: Event) => event.preventDefault());
    render(
      <NavGuardProvider>
        <Form dirty />
        <div contentEditable="true" suppressContentEditableWarning onClick={(event) => reached(event.nativeEvent)}>
          <p>
            {/* The story editor renders a plain <a> inside its editable area, so the test does the same. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/vi/san-pham">Liên kết trong bài</a>
          </p>
        </div>
      </NavGuardProvider>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Liên kết trong bài" }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(reached).toHaveBeenCalledTimes(1);
  });
});

/**
 * Waits until the popstate events that jsdom delivers a moment after back() / go() have arrived: it waits for
 * the next popstate, and stops once none has come for 100 ms. A handler that calls back() again is covered,
 * because its popstate is queued before the next 100 ms timer starts.
 */
async function settle() {
  await act(async () => {
    for (;;) {
      const arrived = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          window.removeEventListener("popstate", onPop);
          resolve(false);
        }, 100);
        function onPop() {
          clearTimeout(timer);
          resolve(true);
        }
        window.addEventListener("popstate", onPop, { once: true });
      });
      if (!arrived) return;
    }
  });
}

function goBackInBrowser() {
  act(() => window.history.back());
}

describe("back button guard", () => {
  it("adds one history entry while dirty, removes it when clean, and does not add a second one", async () => {
    window.history.pushState({ page: "form" }, "");
    const length = window.history.length;
    const { rerender } = render(<Page dirty={false} />);
    expect(window.history.length).toBe(length);

    rerender(<Page dirty />);
    expect(window.history.length).toBe(length + 1);
    rerender(<Page dirty />);
    expect(window.history.length).toBe(length + 1);

    rerender(<Page dirty={false} />);
    await settle();
    expect(window.history.state).toEqual({ page: "form" });

    rerender(<Page dirty />);
    expect(window.history.length).toBe(length + 1);
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
  });

  it("asks when the back button is pressed on a dirty form, and stays on Ở lại", async () => {
    const events = userEvent.setup();
    window.history.pushState({ page: "form" }, "");
    const length = window.history.length;
    render(<Page dirty />);

    goBackInBrowser();
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    // The extra entry is back, so a second press is caught too.
    expect(window.history.length).toBe(length + 1);
    expect(window.history.state).not.toEqual({ page: "form" });

    await events.click(screen.getByRole("button", { name: "Ở lại" }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    await settle();
    expect(window.history.length).toBe(length + 1);
  });

  it("goes back past the page and its extra entry on Rời trang, without a second question", async () => {
    const events = userEvent.setup();
    window.history.pushState({ page: "list" }, "");
    window.history.pushState({ page: "form" }, "");
    render(<Page dirty />);

    goBackInBrowser();
    await events.click(await screen.findByRole("button", { name: "Rời trang" }));
    await settle();
    expect(window.history.state).toEqual({ page: "list" });
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(beforeUnload().defaultPrevented).toBe(false);
  });

  it("opens the admin home on Rời trang when the form was the first page of the tab", async () => {
    const events = userEvent.setup();
    window.history.pushState({ page: "form" }, "");
    render(<Page dirty />);
    goBackInBrowser();
    await screen.findByText(QUESTION);
    const length = vi.spyOn(window.history, "length", "get").mockReturnValue(2);
    await events.click(screen.getByRole("button", { name: "Rời trang" }));
    await settle();
    length.mockRestore();
    expect(replace).toHaveBeenCalledWith("/admin");
    expect(window.history.state).toEqual({ page: "form" });
  });

  it("removes the extra entry before a guarded link is followed", async () => {
    const events = userEvent.setup();
    window.history.pushState({ page: "form" }, "");
    render(<Page dirty />);
    const statesAtClick: unknown[] = [];
    screen.getByRole("navigation", { name: "Menu chính" }).addEventListener("click", (event) => {
      event.preventDefault();
      statesAtClick.push(window.history.state);
    });

    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    await events.click(await screen.findByRole("button", { name: "Rời trang" }));
    await settle();
    expect(statesAtClick).toEqual([{ page: "form" }]);
  });

  it("lets a form navigate by itself only after the extra entry is gone", async () => {
    window.history.pushState({ page: "new" }, "");
    const statesAtNavigation: unknown[] = [];

    function CreateForm() {
      const [leaving, setLeaving] = useState(false);
      const leavePage = useLeavePage();
      useUnsavedChanges(!leaving);
      return (
        <button
          type="button"
          onClick={() => {
            setLeaving(true);
            leavePage(() => statesAtNavigation.push(window.history.state));
          }}
        >
          Tạo
        </button>
      );
    }
    render(
      <NavGuardProvider>
        <CreateForm />
      </NavGuardProvider>,
    );
    // fireEvent is synchronous, so the popstate of the guard's back() cannot have arrived yet.
    fireEvent.click(screen.getByRole("button", { name: "Tạo" }));
    expect(statesAtNavigation).toEqual([]);
    await waitFor(() => expect(statesAtNavigation).toEqual([{ page: "new" }]));
  });

  it("asks before signing out from the More sheet while a form is dirty", async () => {
    const events = userEvent.setup();
    window.history.pushState({ page: "form" }, "");
    render(
      <NavGuardProvider>
        <Form dirty />
        <MoreSheet open onOpenChange={() => undefined} />
      </NavGuardProvider>,
    );
    await events.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
    await events.click(screen.getByRole("button", { name: "Ở lại" }));
    expect(signOut).not.toHaveBeenCalled();

    await events.click(screen.getByRole("button", { name: "Đăng xuất" }));
    await events.click(await screen.findByRole("button", { name: "Rời trang" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(window.history.state).toEqual({ page: "form" });
  });

  it("finishes the back press once when a save ends while the question is open", async () => {
    // The user taps "Lưu" and presses back at once. The save then ends and the form is clean.
    window.history.pushState({ page: "A" }, "");
    window.history.pushState({ page: "list" }, "");
    window.history.pushState({ page: "form" }, "");
    const { rerender } = render(<Page dirty />);

    goBackInBrowser();
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    rerender(<Page dirty={false} />);

    // Nothing is lost any more, so the question closes and the back press goes to the page before the form.
    await waitFor(() => expect(window.history.state).toEqual({ page: "list" }));
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    // And only once: no later traversal moves on to the page before the list.
    await settle();
    expect(window.history.state).toEqual({ page: "list" });
    expect(replace).not.toHaveBeenCalled();
  });

  it("lets a create that ends while the back question is open navigate once, without a second back", async () => {
    // The user taps "Tạo" and presses back at once. The create then ends and the form opens the new item.
    window.history.pushState({ page: "list" }, "");
    window.history.pushState({ page: "new" }, "");
    const statesAtNavigation: unknown[] = [];

    function CreateForm() {
      const [leaving, setLeaving] = useState(false);
      const leavePage = useLeavePage();
      useUnsavedChanges(!leaving);
      return (
        <button
          type="button"
          onClick={() => {
            setLeaving(true);
            leavePage(() => statesAtNavigation.push(window.history.state));
          }}
        >
          Tạo xong
        </button>
      );
    }
    render(
      <NavGuardProvider>
        <CreateForm />
      </NavGuardProvider>,
    );

    goBackInBrowser();
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
    // The dialog hides the page from the accessibility tree; the click stands for the end of the save.
    fireEvent.click(screen.getByRole("button", { name: "Tạo xong", hidden: true }));
    await waitFor(() => expect(statesAtNavigation).toHaveLength(1));
    // A second traversal (a back press finished on top) would arrive within this wait.
    await settle();
    await settle();

    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
    expect(statesAtNavigation).toEqual([{ page: "new" }]);
    expect(window.history.state).toEqual({ page: "new" });
  });

  it("leaves a clean page with one back press after a reload on an old extra entry", async () => {
    // Next.js keeps the custom history state on the first load, so the page starts on the extra entry.
    window.history.pushState({ page: "list" }, "");
    window.history.pushState({ page: "form" }, "");
    window.history.pushState({ nepNhaUnsavedTrap: true }, "");
    render(<Page dirty={false} />);
    // The clean page removes the old extra entry at once.
    await waitFor(() => expect(window.history.state).toEqual({ page: "form" }));

    goBackInBrowser();
    await waitFor(() => expect(window.history.state).toEqual({ page: "list" }));
  });

  it("guards the back button when the form becomes dirty after a reload on an old extra entry", async () => {
    window.history.pushState({ page: "form" }, "");
    window.history.pushState({ nepNhaUnsavedTrap: true }, "");
    const { rerender } = render(<Page dirty={false} />);
    await settle();
    rerender(<Page dirty />);

    goBackInBrowser();
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
  });

  /** "Rời trang" on a guarded link whose navigation never happens: the form stays on screen and dirty. */
  async function leaveWithoutNavigation(events: ReturnType<typeof userEvent.setup>) {
    window.history.pushState({ page: "form" }, "");
    render(<Page dirty />);
    const reached = vi.fn((event: Event) => event.preventDefault());
    screen.getByRole("navigation", { name: "Menu chính" }).addEventListener("click", reached);
    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    await events.click(await screen.findByRole("button", { name: "Rời trang" }));
    await waitFor(() => expect(reached).toHaveBeenCalledTimes(1));
    await settle();
  }

  it("guards again after the question opens again when an earlier Rời trang did not leave", async () => {
    const events = userEvent.setup();
    await leaveWithoutNavigation(events);

    await events.click(screen.getByRole("link", { name: "Câu chuyện" }));
    await events.click(await screen.findByRole("button", { name: "Ở lại" }));
    await settle();
    expect(beforeUnload().defaultPrevented).toBe(true);
    goBackInBrowser();
    expect(await screen.findByText(QUESTION)).toBeInTheDocument();
  });

  it("asks before unload again after the next back press when an earlier Rời trang did not leave", async () => {
    const events = userEvent.setup();
    await leaveWithoutNavigation(events);

    goBackInBrowser();
    await settle();
    expect(beforeUnload().defaultPrevented).toBe(true);
  });

  it("signs out at once from the More sheet when nothing is dirty", async () => {
    const events = userEvent.setup();
    render(
      <NavGuardProvider>
        <Form dirty={false} />
        <MoreSheet open onOpenChange={() => undefined} />
      </NavGuardProvider>,
    );
    await events.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(QUESTION)).not.toBeInTheDocument();
  });
});
